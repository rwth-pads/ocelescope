from typing import TypedDict

from ocelescope.ocel.filter.filters.attribute import (
    AttributeFilterConfig,
    EventAttributeFilter,
    ObjectAttributeFilter,
)
from ocelescope.ocel.filter.filters.entity_type import (
    EventTypeFilter,
    ObjectTypeFilter,
)
from ocelescope.ocel.filter.filters.relation_count import (
    E2OCountFilter,
    O2OCountFilter,
    RelationCountFilterConfig,
)
from ocelescope.ocel.filter.filters.time_range import TimeFrameFilter


class OCELFilter(TypedDict, total=False):
    """
    Composite configuration for filtering an Object-Centric Event Log (OCEL).

    This dictionary specifies which filters to apply when narrowing down
    events, objects, or relations in an OCEL. Each key corresponds to a
    specific filter type. Filters can be combined to form complex
    multi-dimensional selection criteria.

    Attributes:
        object_types (ObjectTypeFilter):
            Filter for selecting or excluding objects based on their type.

        event_type (EventTypeFilter):
            Filter for selecting or excluding events based on their activity name.

        time_range (TimeFrameFilter):
            Filter for including or excluding events within a specific time window.

        o2o_count (list[O2OCountFilter]):
            One or more object-to-object relation count filters that constrain
            how many related objects of a given type an object may have.

        e2o_count (list[E2OCountFilter]):
            One or more event-to-object relation count filters that constrain
            how many related objects (or events) are linked to an entity.

        event_attributes (list[EventAttributeFilter]):
            Filters applied to event attributes (e.g., specific values or ranges).

        object_attributes (list[ObjectAttributeFilter]):
            Filters applied to object attributes (e.g., specific values or ranges).
    """

    object_types: ObjectTypeFilter
    event_type: EventTypeFilter
    time_range: TimeFrameFilter
    o2o_count: list[O2OCountFilter]
    e2o_count: list[E2OCountFilter]
    event_attributes: list[EventAttributeFilter]
    object_attributes: list[ObjectAttributeFilter]


__all__ = [
    "OCELFilter",
    "ObjectTypeFilter",
    "EventTypeFilter",
    "AttributeFilterConfig",
    "ObjectAttributeFilter",
    "EventAttributeFilter",
    "RelationCountFilterConfig",
    "O2OCountFilter",
    "E2OCountFilter",
    "TimeFrameFilter",
]
