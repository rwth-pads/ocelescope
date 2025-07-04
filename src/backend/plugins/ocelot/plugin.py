from typing import Annotated, List, Literal, Optional, Tuple

from fastapi import APIRouter
from fastapi.params import Depends, Query
from pandas.core.frame import DataFrame

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from ocel.ocel_wrapper import OCELWrapper
from plugins.ocelot.models import PaginatedResponse
from plugins.ocelot.util import get_paginated_dataframe, get_sorted_table
from util.cache import instance_lru_cache

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #

    @instance_lru_cache(make_hashable=True)
    def get_sorted_events(
        self,
        ocel: OCELWrapper,
        activity: str,
        sort_by: Optional[Tuple[str, Literal["asc", "desc"]]] = None,
    ) -> DataFrame:
        print(f"sorted_event_{ocel.state_id}")
        if sort_by is None:
            sort_by = (ocel.ocel.event_id_column, "asc")

        return get_sorted_table(
            dataframe=ocel.ocel.events,
            type_field=ocel.ocel.event_activity,
            type_value=activity,
            sort_by=sort_by,
        )

    @instance_lru_cache(make_hashable=True)
    def get_paginated_event_table(
        self,
        ocel: OCELWrapper,
        activity: str,
        page: int,
        page_size: int,
        sort_by: Optional[Tuple[str, Literal["asc", "desc"]]] = None,
    ):
        print(f"Paginated_Event_Table_{ocel.state_id}")

        if sort_by is not None and sort_by[0] == "id":
            sort_by = (ocel.ocel.event_id_column, sort_by[1])
        elif sort_by is not None and sort_by[0] == "timestamp":
            sort_by = (ocel.ocel.event_timestamp, sort_by[1])

        sorted_df = self.get_sorted_events(
            ocel=ocel, activity=activity, sort_by=sort_by
        )
        return get_paginated_dataframe(
            df=sorted_df,
            non_attribute_fields=[
                ocel.ocel.event_id_column,
                ocel.ocel.event_activity,
                ocel.ocel.event_timestamp,
            ],
            page=page,
            page_size=page_size,
            relation_table=ocel.ocel.relations,
            from_field=ocel.ocel.event_id_column,
            to_field=ocel.ocel.object_id_column,
        )

    # ---------------- Objects ---------------- #

    @instance_lru_cache(make_hashable=True)
    def get_sorted_objects(
        self,
        ocel: OCELWrapper,
        object_type: str,
        sort_by: Optional[Tuple[str, Literal["asc", "desc"]]] = None,
    ) -> DataFrame:
        if sort_by is not None and sort_by[0] == "id":
            sort_by = (ocel.ocel.object_id_column, sort_by[1])

        if sort_by is None:
            sort_by = (ocel.ocel.object_id_column, "asc")

        return get_sorted_table(
            dataframe=ocel.ocel.objects,
            type_field=ocel.ocel.object_type_column,
            type_value=object_type,
            sort_by=sort_by,
        )

    @instance_lru_cache(
        make_hashable=True,
    )
    def get_paginated_object_table(
        self,
        ocel: OCELWrapper,
        object_type: str,
        page: int,
        page_size: int,
        sort_by: Optional[Tuple[str, Literal["asc", "desc"]]] = None,
    ) -> PaginatedResponse:
        sorted_df = self.get_sorted_objects(
            ocel=ocel, object_type=object_type, sort_by=sort_by
        )
        return get_paginated_dataframe(
            df=sorted_df,
            non_attribute_fields=[
                ocel.ocel.object_id_column,
                ocel.ocel.object_type_column,
            ],
            page=page,
            page_size=page_size,
            relation_table=ocel.ocel.o2o,
            from_field=ocel.ocel.object_id_column,
            to_field="ocel:oid_2",
        )


def get_state(session: ApiSession):
    return session.get_plugin_state("ocelot", State)


StateDep = Annotated[State, Depends(get_state)]

meta = {
    "name": "ocelot",
    "prefix": "/ocelot",
    "tags": ["ocelot"],
    "description": "Backend for Ocelot",
    "config": {"enabled": True},
}


@router.get("/events", response_model=PaginatedResponse, operation_id="paginatedEvents")
def get_events(
    state: StateDep,
    ocel: ApiOcel,
    activity: Annotated[str, Query(description="Activity name")],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    sort_by: Annotated[Optional[str], Query()] = None,
    ascending: Annotated[bool, Query()] = True,
):
    return state.get_paginated_event_table(
        ocel=ocel,
        activity=activity,
        page=page,
        page_size=page_size,
        sort_by=None if sort_by is None else (sort_by, "asc" if ascending else "desc"),
    )


@router.get(
    "/objects", response_model=PaginatedResponse, operation_id="paginatedObjects"
)
def get_objects(
    state: StateDep,
    ocel: ApiOcel,
    object_type: Annotated[str, Query(description="Object type name")],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    sort_by: Annotated[Optional[str], Query()] = None,
    ascending: Annotated[bool, Query()] = True,
):
    return state.get_paginated_object_table(
        ocel=ocel,
        object_type=object_type,
        page=page,
        page_size=page_size,
        sort_by=None if sort_by is None else (sort_by, "asc" if ascending else "desc"),
    )


@router.get("/objectInfo", response_model=List[str], operation_id="objectInfo")
def get_objects_info(
    ocel: ApiOcel,
):
    return ocel.object_types


@router.get("/eventInfo", response_model=List[str], operation_id="eventInfo")
def get_event_info(
    ocel: ApiOcel,
):
    return ocel.activities
