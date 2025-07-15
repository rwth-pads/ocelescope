# plugin_core.py

from plugin.schema import MethodDefinition


class PluginBase:
    @classmethod
    def plugin_methods(cls) -> dict[str, MethodDefinition]:
        """
        Should return a dict of:
        {
            "method_name": {
                "input_types": [...],
                "output_types": [...],
                "run": function_reference
            }
        }
        """
        raise NotImplementedError("plugin_methods must be implemented")
