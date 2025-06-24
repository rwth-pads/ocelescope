from typing import Union, Annotated
from pydantic import Field

from .time_range import TimeFrameFilterConfig
from .o2o_count import O2OCountFilterConfig
from .e2o_count import E2OCountFilterConfig
from .object_type import ObjectTypeFilterConfig
from .event_type import EventTypeFilterConfig

FilterConfig = Annotated[
    Union[
        TimeFrameFilterConfig,
        O2OCountFilterConfig,
        E2OCountFilterConfig,
        ObjectTypeFilterConfig,
        EventTypeFilterConfig,
    ],
    Field(discriminator="type"),
]
