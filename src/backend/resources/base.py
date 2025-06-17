from abc import ABC
from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class AnnotatedClass(ABC):
    annotation: Optional[dict[str, Any]]


@dataclass
class Resource(AnnotatedClass, ABC):
    pass
