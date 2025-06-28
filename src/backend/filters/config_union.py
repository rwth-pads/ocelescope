from typing import Union, Annotated
from pydantic import Field

from .time_range import TimeFrameFilterConfig
from .attributes import EventAttributeFilterConfig
from .attributes import ObjectAttributeFilterConfig
from .event_type import EventTypeFilterConfig
from .object_type import ObjectTypeFilterConfig
from .relation_count import E2OCountFilterConfig
from .relation_count import O2OCountFilterConfig

FilterConfig = Annotated[
    Union[
        TimeFrameFilterConfig,
        EventAttributeFilterConfig,
        ObjectAttributeFilterConfig,
        EventTypeFilterConfig,
        ObjectTypeFilterConfig,
        E2OCountFilterConfig,
        O2OCountFilterConfig,
    ],
    Field(discriminator="type"),
]
