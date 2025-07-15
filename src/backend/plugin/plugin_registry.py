import tempfile
import uuid
import importlib.util
import inspect
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Dict, Any, List, Type
from api.session import Session

from pydantic.main import BaseModel
from plugin.plugin_core import PluginBase
from plugin.schema import (
    EnumInput,
    InputDefinition,
    MethodDefinition,
    NumberInput,
    OcelInput,
    OutputDefinition,
    RInupt,
)


class PluginMetadata(BaseModel):
    plugin: str
    method: str
    class_: Type[PluginBase]
    method_def: MethodDefinition


class PluginSummary(BaseModel):
    id: str
    plugin: str
    method: str
    input_types: List[InputDefinition]
    output_types: OutputDefinition


def resolve_inputs(
    defs: List[InputDefinition], raw_inputs: Dict[str, Any], session: Session
) -> Dict[str, Any]:
    resolved = {}

    for definition in defs:
        name = definition.name
        raw_value = raw_inputs.get(name, getattr(definition, "default", None))

        if raw_value is None:
            raise ValueError(f"Missing required input: {name}")

        if isinstance(definition, NumberInput):
            resolved[name] = float(raw_value)

        elif isinstance(definition, EnumInput):
            if raw_value not in definition.options:
                raise ValueError(f"Invalid value for {name}: {raw_value}")
            resolved[name] = raw_value

        elif isinstance(definition, OcelInput):
            resolved[name] = session.get_ocel(raw_value)

        elif isinstance(definition, RInupt):
            # You could do further checks here if needed
            resolved[name] = session.get_resource(raw_value)
        else:
            raise TypeError(f"Unsupported input type: {type(definition)}")

    return resolved


class PluginRegistry:
    def __init__(self):
        self.plugins: dict[str, PluginMetadata] = {}

        # Temporary dir for uploaded plugins
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.temp_dir.name)

        # Load built-in plugins
        static_dir = Path(__file__).parent / "static"
        self.load_plugins_from_folder(static_dir)

    def register(self, plugin_cls: Type[PluginBase]) -> List[str]:
        base_id = str(uuid.uuid4())
        plugin_ids = []

        for method_name, method_def in plugin_cls.plugin_methods().items():
            full_id = f"{base_id}:{method_name}"
            self.plugins[full_id] = PluginMetadata(
                plugin=plugin_cls.__name__,
                method=method_name,
                class_=plugin_cls,
                method_def=method_def,
            )
            plugin_ids.append(full_id)

        return plugin_ids

    def list_plugins(self) -> list[PluginSummary]:
        return [
            PluginSummary(
                id=plugin_id,
                plugin=meta.plugin,
                method=meta.method,
                input_types=meta.method_def.input_types,
                output_types=meta.method_def.output_types,
            )
            for plugin_id, meta in self.plugins.items()
        ]

    def run_plugin(
        self, plugin_id: str, inputs: Dict[str, Any], session: Session
    ) -> Dict[str, Any]:
        plugin = self.plugins.get(plugin_id)
        if not plugin:
            raise ValueError("Plugin method not found")
        resolved_inputs = resolve_inputs(plugin.method_def.input_types, inputs, session)
        instance = plugin.class_()
        result = plugin.method_def.run(instance, resolved_inputs)

        if isinstance(result, dict):
            return result
        return {"result": result}

    def load_plugins_from_folder(self, folder: Path) -> List[str]:
        plugin_ids = []
        for py_file in folder.rglob("*.py"):
            plugin_ids += self._load_plugin_from_file(py_file)
        return plugin_ids

    def load_plugins_from_zip(self, zip_file) -> List[str]:
        plugin_folder = self.base_dir / uuid.uuid4().hex
        plugin_folder.mkdir(parents=True)
        zip_data = zip_file.read()
        with zipfile.ZipFile(BytesIO(zip_data), "r") as zf:
            zf.extractall(plugin_folder)

        plugin_ids = []
        for py_file in plugin_folder.rglob("*.py"):
            plugin_ids += self._load_plugin_from_file(py_file)

        return plugin_ids

    def _load_plugin_from_file(self, py_file: Path) -> List[str]:
        module_name = f"plugin_{uuid.uuid4().hex}"
        spec = importlib.util.spec_from_file_location(module_name, py_file)
        if spec is None or spec.loader is None:
            return []

        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        plugin_ids = []
        for _, obj in inspect.getmembers(mod, inspect.isclass):
            if issubclass(obj, PluginBase) and obj is not PluginBase:
                plugin_ids += self.register(obj)

        return plugin_ids
