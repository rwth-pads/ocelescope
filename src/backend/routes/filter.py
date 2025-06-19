from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiOcel, ApiSession
from lib.filters import FilterConfig

filterRouter = APIRouter(prefix="/filter", tags=["filter"])


class FilterPipeLine(BaseModel):
    pipeline: list[FilterConfig]


@filterRouter.get(
    "/",
    response_model=FilterPipeLine,
    operation_id="getFilters",
)
def get_filter(ocel: ApiOcel, session: ApiSession) -> FilterPipeLine:
    return FilterPipeLine(pipeline=session.get_ocel_filters(ocel.id))


@filterRouter.post(
    "/",
    operation_id="setFilters",
)
def set_filter(ocel: ApiOcel, session: ApiSession, pipeline: FilterPipeLine):
    session.filter_ocel(ocel_id=ocel.id, filters=pipeline.pipeline)
    return
