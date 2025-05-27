from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiOcel
from lib.filters import FilterConfig

filterRouter = APIRouter(prefix="/filter", tags=["filter"])


class FilterPipeLine(BaseModel):
    pipeline: list[FilterConfig]


@filterRouter.get(
    "/",
    response_model=FilterPipeLine,
    operation_id="getFilters",
)
def get_object_attributes(
    ocel: ApiOcel,
) -> FilterPipeLine:
    return FilterPipeLine(pipeline=ocel.get_filters())


@filterRouter.post(
    "/",
    operation_id="setFilters",
)
def get_event_attributes(ocel: ApiOcel, pipeline: FilterPipeLine):
    ocel.set_filters(pipeline.pipeline)
    ocel.ocel
    return
