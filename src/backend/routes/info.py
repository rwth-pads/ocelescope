from fastapi.routing import APIRouter

from api.dependencies import ApiOcel
from lib.atttributes import (
    AttributeSummary,
    summarize_event_attributes,
    summarize_object_attributes,
)
from lib.relations import (
    O2ORelation,
    RelationCountSummary,
    get_o2o_relations,
    get_ocel_object_relations,
)

infoRouter = APIRouter(prefix="/info", tags=["info"])


@infoRouter.get(
    "/objects/attributes",
    response_model=dict[str, list[AttributeSummary]],
    operation_id="objectAttributes",
)
def get_object_attributes(
    ocel: ApiOcel,
):
    return summarize_object_attributes(ocel.ocel)


@infoRouter.get(
    "/events/attributes",
    response_model=dict[str, list[AttributeSummary]],
    operation_id="eventAttributes",
)
def get_event_attributes(
    ocel: ApiOcel,
):
    return summarize_event_attributes(ocel.ocel)


@infoRouter.get(
    "/events/counts",
    response_model=dict[str, int],
    operation_id="eventCounts",
)
def get_event_counts(
    ocel: ApiOcel,
) -> dict[str, int]:
    return ocel.activity_counts.to_dict()


@infoRouter.get(
    "/objects/counts",
    response_model=dict[str, int],
    operation_id="objectCount",
)
def get_object_counts(
    ocel: ApiOcel,
) -> dict[str, int]:
    return ocel.otype_counts.to_dict()


@infoRouter.get(
    "/relations/e2o",
    response_model=list[RelationCountSummary],
    operation_id="e2o",
)
def get_e2o(
    ocel: ApiOcel,
) -> list[RelationCountSummary]:
    return get_ocel_object_relations(ocel.ocel)


@infoRouter.get(
    "/relations/o2o",
    response_model=list[O2ORelation],
    operation_id="o2o",
)
def get_object_relations(
    ocel: ApiOcel,
) -> list[O2ORelation]:
    return get_o2o_relations(ocel)
