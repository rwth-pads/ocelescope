from dataclasses import dataclass
import inspect
from typing import (
    Annotated,
    Callable,
    Optional,
    Type,
    TypedDict,
    get_origin,
    get_type_hints,
    get_args,
)
from pydantic import BaseModel
from ocel.ocel_wrapper import OCELWrapper


class MethodInfo(TypedDict):
    input_model: Type[BaseModel]
    output_model: Type[BaseModel]
    method: Callable


@dataclass
class OCELAnnotation:
    label: Optional[str]
    description: Optional[str]


class PluginOCEL(BaseModel):
    name: str
    label: Optional[str]
    description: Optional[str]


class PluginMethod(BaseModel):
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    input_model: Optional[dict] = None
    input_ocels: list[PluginOCEL]


class PluginMetadata(BaseModel):
    name: str
    version: str
    description: Optional[str]


class PluginDescription(BaseModel):
    metadata: PluginMetadata
    methods: dict[str, PluginMethod]


class BasePlugin:
    @classmethod
    def describe(cls) -> PluginDescription:
        plugin_meta = getattr(cls, "_plugin_metadata", {})
        methods_info: dict[str, PluginMethod] = {}

        for name, method in inspect.getmembers(cls, predicate=inspect.isfunction):
            if not hasattr(method, "_plugin_method_metadata"):
                continue

            hints = get_type_hints(method, include_extras=True)

            input_model = hints.get("input")

            if not (
                isinstance(input_model, type) and issubclass(input_model, BaseModel)
            ):
                continue

            ocel_fields: list[PluginOCEL] = []

            for name, hint in hints.items():
                annotations = []
                if get_origin(hint) is Annotated:
                    base_type, *annotations = get_args(hint)
                else:
                    base_type = hint

                if not (
                    isinstance(base_type, type) and issubclass(base_type, OCELWrapper)
                ):
                    continue

                label = None
                description = None

                for annotation in annotations:
                    if isinstance(annotation, OCELAnnotation):
                        label = annotation.label
                        description = annotation.description

                ocel_fields.append(
                    PluginOCEL(name=name, label=label, description=description)
                )

            method_meta = getattr(method, "_plugin_method_metadata", {})

            methods_info[name] = PluginMethod(
                description=method_meta.get("description"),
                tags=method_meta.get("tags", []),
                input_model=input_model.model_json_schema(),
                input_ocels=ocel_fields,
            )

        return PluginDescription(
            metadata=PluginMetadata(
                name=plugin_meta.get("name", cls.__name__),
                version=plugin_meta.get("version", "0.1"),
                description=plugin_meta.get("description", ""),
            ),
            methods=methods_info,
        )

    @classmethod
    def get_method_map(cls) -> dict[str, MethodInfo]:
        method_map = {}
        for name, method in inspect.getmembers(cls, predicate=inspect.isfunction):
            if not hasattr(method, "_plugin_method_metadata"):
                continue

            hints = get_type_hints(method)

            input_model = hints.get("input")
            output_model = hints.get("return")

            if (
                input_model
                and output_model
                and issubclass(input_model, BaseModel)
                and issubclass(output_model, BaseModel)
            ):
                method_map[name] = MethodInfo(
                    input_model=input_model,
                    output_model=output_model,
                    method=getattr(cls(), name),
                )

        return method_map
