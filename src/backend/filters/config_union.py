from typing import Union, Annotated
from pydantic import Field

from .time_range import TimeFrameFilterConfig
from .attributes import EventAttributeFilterConfig
from .attributes import ObjectAttributeFilterConfig
from .object_type import ObjectTypeFilterConfig
from .event_type import EventTypeFilterConfig
from .relation_count import E2OCountFilterConfig
from .relation_count import O2OCountFilterConfig

FilterConfig = Annotated[
    Union[
        TimeFrameFilterConfig,
        EventAttributeFilterConfig,
        ObjectAttributeFilterConfig,
        ObjectTypeFilterConfig,
        EventTypeFilterConfig,
        E2OCountFilterConfig,
        O2OCountFilterConfig,
    ],
    Field(discriminator="type"),
]
