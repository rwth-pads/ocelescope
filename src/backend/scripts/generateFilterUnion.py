import re
import pathlib

FILTERS_DIR = pathlib.Path(__file__).parent.parent / "filters"
output_file = FILTERS_DIR / "config_union.py"


def get_config_classes():
    classes = []
    for file in FILTERS_DIR.iterdir():
        if file.suffix == ".py" and file.name not in (
            "__init__.py",
            "base.py",
            "config_union.py",
            "generate_union.py",
        ):
            with file.open("r") as f:
                content = f.read()
                matches = re.findall(
                    r"class (\w+FilterConfig)\(BaseFilterConfig\)", content
                )
                for match in matches:
                    classes.append((file.stem, match))
    return classes


def generate_union():
    classes = get_config_classes()
    imports = "\n".join(f"from .{mod} import {cls}" for mod, cls in classes)
    union_body = ",\n        ".join(cls for _, cls in classes)

    content = f"""from typing import Union, Annotated
from pydantic import Field

{imports}

FilterConfig = Annotated[
    Union[
        {union_body}
    ],
    Field(discriminator="type")
]
"""
    output_file.write_text(content)
    print(f"Generated {output_file}")


if __name__ == "__main__":
    generate_union()
