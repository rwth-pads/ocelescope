from typing import Union, Annotated
from pydantic import Field

from .time_range import TimeFrameFilterConfig
from .e2o_count import E2OCountFilterConfig
from .event_type import EventTypeFilterConfig
from .object_type import ObjectTypeFilterConfig

FilterConfig = Annotated[
    Union[
        TimeFrameFilterConfig,
        E2OCountFilterConfig,
        EventTypeFilterConfig,
        ObjectTypeFilterConfig,
    ],
    Field(discriminator="type"),
]
