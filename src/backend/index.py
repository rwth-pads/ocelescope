from __future__ import annotations

import datetime
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

from fastapi import FastAPI, File, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from api.config import OceanConfig, config
from api.dependencies import ApiOcel, ApiSession, ApiTask
from api.docs import init_custom_docs
from api.exceptions import BadRequest, NotFound
from api.middleware import ocel_access_middleware
from api.model.response import TempFileResponse
from api.model.task import TaskStatusResponse
from api.model.with_ocel import set_ocel_context
from api.session import Session
from api.utils import (
    custom_snake2camel,
    error_handler_server,
    verify_parameter_alias_consistency,
)
from ocel.default_ocel import (
    DEFAULT_OCEL_KEYS,
    DefaultOCEL,
    filter_default_ocels,
    get_default_ocel,
    load_default_ocels,
)
from ocel.ocel_wrapper import OCELWrapper
from plugin_loader import register_plugins
from routes.filter import filterRouter
from routes.info import infoRouter
from routes.session import sessionRouter
from util.misc import export_example_settings_as_dotenv
from version import __version__

"""
In this file, all API routes of the OCEAn application are defined.
"""

# Init default sessions
load_default_ocels()

# Initialize FastAPI
app = FastAPI(
    title="OCEAn",
    version=__version__,
    docs_url=None,  # disable swagger docs, use rapidoc instead (call to init_custom_docs below)
    redoc_url=None,
    debug=True,
)
origins = ["http://localhost:3000"]  # Frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # enable cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(ocel_access_middleware)

# Error handler for internal server errors
app.exception_handler(Exception)(error_handler_server)

register_plugins(app)
app.include_router(infoRouter)
app.include_router(filterRouter)
app.include_router(sessionRouter)
init_custom_docs(app)


# ----- TASK MANAGEMENT ------------------------------------------------------------------------------------------
# region


@app.get("/task-status", summary="Task status")
def task_status(
    session: ApiSession,
    task: ApiTask,
) -> TaskStatusResponse:
    """Return the status of a long-running task."""
    return TaskStatusResponse(**session.respond(route="task-status", msg=None, task=task))


# endregion


@app.post("/import", summary="Import OCEL 2.0 from .sqlite file", operation_id="importOcel")
def import_ocel(
    session: ApiSession,
    response: Response,
    file: Annotated[
        UploadFile,
        File(description="An OCEL 2.0 event log (.sqlite format)"),
    ],
    name: Annotated[
        str,
        Query(description="The name of the uploaded file", pattern=r"[\w\-\(\)]+\.[a-z]+"),
        # Need original file name because client-side formData creation in generated api wrapper does not retain it
    ],
) -> Response:
    if file.filename is None or file.filename == "":
        raise BadRequest("No file uploaded")

    # Save file
    upload_date = datetime.datetime.now()
    file_name_path = Path(name)
    tmp_file_prefix = upload_date.strftime("%Y%m%d-%H%M%S") + "-" + file_name_path.stem

    try:
        with NamedTemporaryFile(
            delete=False,
            prefix=tmp_file_prefix,
            suffix=file_name_path.suffix,
        ) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
    except Exception as err:
        raise err
    finally:
        file.file.close()

    # pm4py-based import
    ocel = OCELWrapper.read_ocel2_sqlite_with_report(
        str(tmp_path),
        original_file_name=name,
        version_info=True,
        output=False,
        upload_date=upload_date,
    )
    set_ocel_context(ocel)

    session.add_ocel(ocel)

    response.status_code = 200

    return response


@app.get("/ocel/default", summary="Get default OCEL metadata", operation_id="getDefaultOcel")
def default_ocels(
    only_latest_versions: bool = True,
    only_preloaded: bool = False,
) -> list[DefaultOCEL]:
    filtered = filter_default_ocels(
        exclude_hidden=True,
        only_latest_versions=only_latest_versions,
        only_preloaded=only_preloaded,
    )
    return filtered


@app.post("/import-default", summary="Import default OCEL", operation_id="importDefaultOcel")
def import_default_ocel(
    response: Response,
    session: ApiSession,
    key: str = Query(
        description="Default OCEL key",
        examples=DEFAULT_OCEL_KEYS,
    ),
    version: str | None = Query(
        default=None,
        description="Dataset version (optional)",
        examples=["1.0"],
    ),
) -> Response:
    default_ocel = get_default_ocel(key=key, version=version)
    if default_ocel is None:
        raise NotFound("The given default OCEL was not found")

    # Load OCEL
    ocel = default_ocel.get_ocel_copy(use_abbreviations=False)
    set_ocel_context(ocel)

    session.add_ocel(ocel)
    response.status_code = 200

    return response


# endregion

# ----- DOWNLOAD / EXPORT ------------------------------------------------------------------------------------------
# region


@app.get("/download", summary="Download OCEL including app state")
def download_ocel(
    session: ApiSession,
    ocel: ApiOcel,
) -> TempFileResponse:
    name = ocel.meta["fileName"]
    tmp_file_prefix = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + name
    file_response = TempFileResponse(prefix=tmp_file_prefix, suffix=".sqlite", filename=name)
    session.export_sqlite(file_response.tmp_path)
    return file_response


# endregion


def post_init_tasks():
    """Non-blocking tasks to be executed after the API has been initialized"""

    # Verify parameter aliases are consistent
    verify_parameter_alias_consistency(app, custom_snake2camel)

    # Generate .env.example file
    export_example_settings_as_dotenv(OceanConfig, ".env.example")


post_init_tasks()
