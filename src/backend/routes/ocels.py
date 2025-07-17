import datetime
from pathlib import Path
import shutil
from tempfile import NamedTemporaryFile
from typing import Annotated, Literal, Optional

from api.dependencies import ApiOcel, ApiSession
from api.exceptions import BadRequest, NotFound
from api.model.events import Date_Distribution_Item, Entity_Time_Info
from api.model.ocel import Filter, OcelListResponse, OcelMetadata, UploadingOcelMetadata
from api.model.response import TempFileResponse
from lib.attributes import AttributeSummary
from lib.relations import RelationCountSummary
from ocel.default_ocel import (
    DEFAULT_OCEL_KEYS,
    DefaultOCEL,
    filter_default_ocels,
    get_default_ocel,
)
from tasks.ocel import import_ocel_task
from util.constants import SUPPORTED_FILE_TYPES
from util.tasks import TaskState

from fastapi import APIRouter, File, Query, Response, UploadFile

ocels_router = APIRouter(prefix="/ocels", tags=["ocels"])


# region Management
@ocels_router.get(
    "/",
    summary="List uploaded and uploading OCELs",
    description=(
        "Returns metadata for all uploaded OCELs along with any OCEL files "
        "currently being imported. Includes the ID of the currently active OCEL, "
        "if one is selected."
    ),
    operation_id="getOcels",
)
def getOcels(session: ApiSession) -> OcelListResponse:
    return OcelListResponse(
        current_ocel_id=session.current_ocel_id,
        ocels=[
            OcelMetadata(
                created_at=value.original.meta["uploadDate"],
                id=key,
                name=value.original.meta["fileName"],
                extensions=[
                    extension.name for extension in value.original.get_extensions_list()
                ],
            )
            for key, value in session.ocels.items()
        ],
        uploading_ocels=[
            UploadingOcelMetadata(
                task_id=task.key,
                name=task.metadata["file_name"],
                uploaded_at=task.metadata["upload_date"],
            )
            for task in session.list_tasks()
            if (task.name == "import_ocel_task") & (task.state == TaskState.STARTED)
        ],
    )


@ocels_router.post(
    "/ocel",
    summary="Set the current active OCEL",
    description=(
        "Sets the active OCEL to the one with the provided `ocel_id`. "
        "Subsequent operations may use this as the default OCEL context."
    ),
    operation_id="setCurrentOcel",
)
def set_current_ocel(session: ApiSession, ocel_id: str):
    session.set_current_ocel(ocel_id)


@ocels_router.post(
    "/ocel/delete",
    summary="Delete an uploaded OCEL",
    description=(
        "Deletes the uploaded OCEL with the given `ocel_id`. "
        "This action is irreversible and removes the OCEL from the session."
    ),
    operation_id="deleteOcel",
)
def delete_ocel(session: ApiSession, ocel_id: str):
    session.delete_ocel(ocel_id)


@ocels_router.post(
    "/ocel/rename",
    summary="Rename an uploaded OCEL",
    description=(
        "Renames the OCEL represented by the given `ApiOcel` object to `new_name`. "
        "This updates the display name used in the UI and metadata."
    ),
    operation_id="renameOcel",
)
def rename_ocel(ocel: ApiOcel, new_name: str):
    ocel.rename(new_name)


# endregion
# region Info
@ocels_router.get(
    "/objects/attributes",
    response_model=dict[str, list[AttributeSummary]],
    operation_id="objectAttributes",
)
def get_object_attributes(
    ocel: ApiOcel,
):
    return ocel.object_attribute_summary


@ocels_router.get(
    "/events/attributes",
    response_model=dict[str, list[AttributeSummary]],
    operation_id="eventAttributes",
)
def get_event_attributes(
    ocel: ApiOcel,
):
    return ocel.event_attribute_summary


@ocels_router.get(
    "/events/counts",
    response_model=dict[str, int],
    operation_id="eventCounts",
)
def get_event_counts(
    ocel: ApiOcel,
) -> dict[str, int]:
    return ocel.activity_counts.to_dict()


@ocels_router.get(
    "/events/time",
    response_model=Entity_Time_Info,
    operation_id="timeInfo",
)
def get_time_info(
    ocel: ApiOcel,
) -> Entity_Time_Info:
    events = ocel.events
    timestamp_column_name = ocel.ocel.event_timestamp
    activity_column_name = ocel.ocel.event_activity

    # Group by date and activity, then count
    time_frame_count = (  # type:ignore
        events.groupby([events[timestamp_column_name].dt.date, activity_column_name])
        .size()
        .reset_index(name="count")
    )

    # Build distribution per date
    date_distribution = []
    for date, group in time_frame_count.groupby(timestamp_column_name):
        row = {
            "date": str(date),
            "entity_count": dict(zip(group[activity_column_name], group["count"])),
        }
        date_distribution.append(Date_Distribution_Item(**row))

    # Get start and end time of events
    start_time = events[timestamp_column_name].min().isoformat(timespec="microseconds")
    end_time = events[timestamp_column_name].max().isoformat(timespec="microseconds")

    return Entity_Time_Info(
        end_time=end_time,
        start_time=start_time,
        date_distribution=date_distribution,
    )


@ocels_router.get(
    "/objects/counts",
    response_model=dict[str, int],
    operation_id="objectCount",
)
def get_object_counts(
    ocel: ApiOcel,
) -> dict[str, int]:
    return ocel.otype_counts.to_dict()


@ocels_router.get(
    "/relations/e2o",
    response_model=list[RelationCountSummary],
    operation_id="e2o",
)
def get_e2o(
    ocel: ApiOcel, direction: Optional[Literal["source", "target"]] = "source"
) -> list[RelationCountSummary]:
    return ocel.e2o_summary(direction=direction)


@ocels_router.get(
    "/relations/o2o",
    response_model=list[RelationCountSummary],
    operation_id="o2o",
)
def get_object_relations(
    ocel: ApiOcel, direction: Optional[Literal["source", "target"]] = "source"
) -> list[RelationCountSummary]:
    return ocel.o2o_summary(direction=direction)


# endregion
# region Filters
@ocels_router.get(
    "/filter",
    response_model=Filter,
    operation_id="getFilters",
)
def get_filter(ocel: ApiOcel, session: ApiSession) -> Filter:
    return Filter(pipeline=session.get_ocel_filters(ocel.id))


@ocels_router.post(
    "/",
    operation_id="setFilters",
)
def set_filter(ocel: ApiOcel, session: ApiSession, filter: Filter):
    session.filter_ocel(ocel_id=ocel.id, filters=filter.pipeline)
    return


# endregion
# region Import/Export
@ocels_router.post(
    "/import", summary="Import OCEL 2.0 from .sqlite file", operation_id="importOcel"
)
def import_ocel(
    session: ApiSession,
    response: Response,
    file: Annotated[
        UploadFile,
        File(description="An OCEL 2.0 event log (.sqlite format)"),
    ],
    name: Annotated[
        str,
        Query(
            description="The name of the uploaded file", pattern=r"[\w\-\(\)]+\.[a-z]+"
        ),
        # Need original file name because client-side formData creation in generated api wrocels_routerer does not retain it
    ],
) -> Response:
    if file.filename is None or file.filename == "":
        raise BadRequest("No file uploaded")

    # Save file
    upload_date = datetime.datetime.now()
    file_name_path = Path(name)
    tmp_file_prefix = upload_date.strftime("%Y%m%d-%H%M%S") + "-" + file_name_path.stem

    match file_name_path.suffix.lower():
        case ".xml":
            suffix = ".xmlocel"
        case ".json":
            suffix = ".jsonocel"
        case _:
            suffix = file_name_path.suffix.lower()

    if suffix not in SUPPORTED_FILE_TYPES:
        raise BadRequest(
            f"Unsupported file type: {file_name_path.suffix}. Supported types are: {', '.join(SUPPORTED_FILE_TYPES)}"
        )
    try:
        with NamedTemporaryFile(
            delete=False,
            prefix=name,
            suffix=suffix,
        ) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)
    except Exception as err:
        raise err
    finally:
        file.file.close()

    import_ocel_task(
        session=session,
        path=tmp_path,
        upload_date=upload_date,
        name=tmp_file_prefix,
        suffix=suffix,
        metadata={"file_name": tmp_file_prefix, "upload_date": upload_date.isoformat()},  # type: ignore
    )

    response.status_code = 200

    return response


@ocels_router.get(
    "/ocel/default", summary="Get default OCEL metadata", operation_id="getDefaultOcel"
)
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


@ocels_router.post(
    "/import-default", summary="Import default OCEL", operation_id="importDefaultOcel"
)
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

    session.add_ocel(ocel)
    response.status_code = 200

    return response


@ocels_router.get("/download", summary="Download OCEL including app state")
def download_ocel(
    ocel: ApiOcel,
    ext: Optional[Literal[".xml", ".json", ".sqlite"]],
) -> TempFileResponse:
    name = ocel.meta["fileName"]
    tmp_file_prefix = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + "-" + name
    file_response = TempFileResponse(
        prefix=tmp_file_prefix, suffix=ext, filename=name + (ext or ".sqlite")
    )

    ocel.write_ocel(file_response.tmp_path, ext)

    return file_response


# endregion
