from __future__ import annotations

import datetime
import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated, Literal

from fastapi import FastAPI, File, Header, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

import visualization.ocpn as viz_ocpn
from api import session
from api.config import OceanConfig, config
from api.dependencies import ApiObjectType, ApiObjectTypes, ApiOcel, ApiSession, ApiTask
from api.docs import init_custom_docs
from api.exceptions import BadRequest, NotFound, Unauthorized
from api.logger import logger
from api.middleware import ocel_access_middleware
from api.model.app_state import AppState
from api.model.base import RequestBody
from api.model.response import BaseResponse, OcelResponse, TempFileResponse
from api.model.task import TaskStatusResponse
from api.model.with_ocel import set_ocel_context
from api.serialize import ocel_to_api
from api.session import Session
from api.utils import (
    custom_snake2camel,
    error_handler_server,
    export_openapi_schema,
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


# ----- TEST THE SESSION ------------------------------------------------------------------------------------------
# region
@app.post("/testSession", summary="Test session", operation_id="testSession")
def test_session(
    session: ApiSession,
):
    """Test the session and return a response."""
    print(session)


# endregion
# ----- IMPORT / LOAD ------------------------------------------------------------------------------------------
# region


@app.post("/import", summary="Import OCEL 2.0 from .sqlite file", operation_id="importOcel")
def import_ocel(
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

    # Check file
    # ...

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

    # Init session
    session = Session(
        ocel=ocel,
        app_state=AppState.import_sqlite(tmp_path, ocel=ocel),
    )

    response.set_cookie(
        key=config.SESSION_ID_HEADER,
        value=session.id,
        httponly=True,
        secure=False,
        samesite="lax",
    )
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

    # Load default app state (JSON)
    app_state = None
    if default_ocel.default_app_state:
        try:
            AppState.instantiate(default_ocel.default_app_state, ocel=ocel)
        except ValidationError as err:
            # When attribute units are saved to the JSON file with a renamed name (after unit detection), these will cause a Validation error here.
            is_attr_not_found = ["attribute not found" in e["msg"] for e in err.errors()]
            if not all(is_attr_not_found):
                raise err

            logger.warning(
                f"Attribute(s) from default app state not found, skipping attribute units ..."
            )
            default_ocel.default_app_state.pop("attributeUnits")
            app_state = AppState.instantiate(default_ocel.default_app_state, ocel=ocel)

    # Load app state (sqlite)
    if default_ocel.app_state and not default_ocel.app_state.empty:
        if app_state and not app_state.empty:
            logger.warning(
                "Default OCEL has both default app state (JSON) and app state (sqlite) specified. Using values from sqlite."
            )
        app_state = default_ocel.app_state

    if app_state is None:
        app_state = AppState.instantiate({}, ocel=ocel)

    # Init session
    session = Session(
        ocel=ocel,
        app_state=app_state,
    )

    response.set_cookie(
        key=config.SESSION_ID_HEADER,
        value=session.id,
        httponly=True,
        secure=False,
        samesite="lax",
    )
    response.status_code = 200

    return response


@app.get("/load", summary="Load OCEL")
def load_ocel(
    session: ApiSession,
    ocel: ApiOcel,
) -> OcelResponse:
    return OcelResponse(
        **session.respond(
            route="load",
            msg=f'Event log "{ocel.meta["fileName"] or session.id}" has been loaded from the server.',
            ocel=ocel_to_api(ocel, session=session),
        )
    )


@app.get("/validate", summary="Load OCEL", operation_id="validateSession")
def validate_session(
    _session: ApiSession,
    response: Response,
) -> Response:
    response.status_code = 200
    return response


# endregion

# ----- DOWNLOAD / EXPORT ------------------------------------------------------------------------------------------
# region


@app.get("/download", summary="Download OCEL including app state")
def download_ocel(
    session: ApiSession,
    ocel: ApiOcel,
    token: Annotated[str, Header()],
    emissions: Literal["events", "objects", False] = Query(
        default=False,
        description="Controls on what level emission values are included in the resulting OCEL file as a new attribute. To preserve overall emissions, it is not possible to include both event and object emissions.",
    ),
) -> TempFileResponse:
    # Authenticate via api state
    # TODO might use this for all API routes - or research different token-based auth method
    if token != session.state:
        raise Unauthorized

    # Export to file
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

    # Export OpenAPI schema to file
    export_openapi_schema(app, config.OPENAPI_SCHEMA_PATH)


post_init_tasks()
