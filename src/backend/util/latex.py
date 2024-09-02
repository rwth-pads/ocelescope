import re
from typing import Literal

import numpy as np

LatexFontSize = Literal["normal", "small", "footnote", "script", "tiny", "large"]


def size_cmd(fontsize: LatexFontSize):
    sizes_add_size = ["script", "footnote", "normal"]
    sizecmd = rf"\{fontsize}" + ("size" if fontsize in sizes_add_size else "")
    return sizecmd


def indent_latex(latex: str):
    indented_lines = []
    indent_level = 0
    begin_pattern = re.compile(r"^\\begin\{.+\}")
    end_pattern = re.compile(r"^\\end\{.+\}")
    for line in latex.split("\n"):
        stripped_line = line.strip()
        if end_pattern.match(stripped_line):
            indent_level -= 1
        indented_lines.append("  " * indent_level + stripped_line)
        if begin_pattern.match(stripped_line):
            indent_level += 1
    return "\n".join(indented_lines)


def format_si_percentage(
    x: float,
    *,
    prec: int = 1,
    na_rep: str = r"{\textemdash}",
):
    if np.isnan(x):
        return na_rep
    num = f"{x:.{prec}%}".strip()
    return f"\\qty{{{num[:-1]}}}{{\\percent}}"
