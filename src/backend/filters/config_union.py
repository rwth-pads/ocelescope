from typing import Union, Annotated
from pydantic import Field

from .time_range import TimeFrameFilterConfig
from .e2o_count import E2OCountFilterConfig
from .event_type import EventTypeFilterConfig
from .object_type import ObjectTypeFilterConfig
from .o2o_count import O2OCountFilterConfig

FilterConfig = Annotated[
    Union[
        TimeFrameFilterConfig,
        E2OCountFilterConfig,
        EventTypeFilterConfig,
        ObjectTypeFilterConfig,
        O2OCountFilterConfig,
    ],
    Field(discriminator="type"),
]
