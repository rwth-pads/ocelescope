from typing import Callable, get_type_hints
import hashlib

import json
from pydantic.main import BaseModel

from outputs.vizualizations import Visualization
from .base import OutputBase


class OutputRegistry:
    def __init__(self) -> None:
        self._output_schema_hashes: dict[str, str] = {}
        self._visualizers: dict[str, Callable] = {}

    def _schema_hash(self, cls: type[BaseModel]) -> str:
        schema = json.dumps(cls.model_json_schema(), sort_keys=True)
        return hashlib.sha256(schema.encode()).hexdigest()

    def register_output(self):
        def decorator(cls: type[OutputBase]):
            output_type = cls.model_fields["type"].default
            output_hash = self._schema_hash(cls)

            if (
                output_type in self._output_schema_hashes
                and self._output_schema_hashes[output_type] != output_hash
            ):
                raise ValueError(
                    f"Conflicting output definition for type '{output_type}'.\n"
                    f"Previous schema differs from new one."
                )

            self._output_schema_hashes[output_type] = output_hash
            return cls

        return decorator

    def register_visualizer(self):
        def decorator(fn: Callable[[OutputBase], Visualization]):
            hints = get_type_hints(fn)

            param_types = list(hints.values())

            if not param_types:
                raise TypeError("Visualizer function must accept one argument")

            output_cls = param_types[0]

            if not issubclass(output_cls, OutputBase):
                raise TypeError("Visualizer argument must be a subclass of BaseModel")

            output_type = output_cls.model_fields["type"].default

            self._visualizers[output_type] = fn

            return fn

        return decorator

    def visualize(self, output: OutputBase) -> Visualization:  # type: ignore
        if output.type not in self._visualizers:
            raise ValueError("No registered vizualizations found")

        return self._visualizers[output.type](output)
