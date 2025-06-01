from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, List, Literal, Optional, Type, TypeVar

from util.constants import SUPPORTED_FILE_TYPES

T = TypeVar("T", bound="OcelExtension")


class OcelExtension(ABC):
    """
    Abstract base class for OCEL extensions that can be imported/exported from a file path.
    """

    name: str
    description: str
    version: str
    supported_extensions: list[str]

    def __init__(self, *args, **kwargs):
        super().__init__()

    @staticmethod
    @abstractmethod
    def has_extension(path: Path) -> bool:
        """
        Check if the extension data exists at the given path.
        """
        pass

    @classmethod
    @abstractmethod
    def import_extension(cls: Type[T], path: Path) -> T:
        """
        Create the extension by reading from the given path.
        """
        pass

    @abstractmethod
    def export_extension(self, path: Path) -> None:
        """
        Write the extension data to the given path.
        """
        pass


# ----- Extension Registry -----

extension_registry: Dict[str, Type[OcelExtension]] = {}


def register_extension(cls: Type[OcelExtension]) -> Type[OcelExtension]:
    # Enforce metadata presence
    for attr in ("name", "description", "version"):
        if not hasattr(cls, attr):
            raise ValueError(f"Extension {cls.__name__} must define static '{attr}' attribute.")
    extension_registry[cls.name] = cls
    return cls


def get_registered_extensions() -> List[Type[OcelExtension]]:
    return list(extension_registry.values())


def get_extension_by_name(name: str) -> Optional[Type[OcelExtension]]:
    return extension_registry.get(name)


def list_extension_metadata() -> List[dict]:
    return [
        {"name": cls.name, "description": cls.description, "version": cls.version}
        for cls in extension_registry.values()
    ]
