from __future__ import annotations

import re
from typing import Any, Callable, Literal

import pandas as pd
from pandas.io.formats.style import Styler
from util.pandas import NumSeriesAgg
from util.jupyter import set_clipboard
from util.latex import LatexFontSize, indent_latex, size_cmd


def format_row_wise(
    styler,
    formatter: dict,
    index: pd.Index | None = None,
    offset: int = 0,
):
    index = index if index is not None else styler.index
    for row, row_formatter in formatter.items():
        row_num = index.get_loc(row)
        for col_num in range(offset, len(styler.columns)):
            styler._display_funcs[(row_num, col_num)] = row_formatter
    return styler


COMMON_COLUMN_RENAMER = {
    "ocel:type": "Object type",
    "ocel:activity": "Activity",
    "ocel:qualifier": "Qualifier",
    "freq": "Freq.",
}


def df_to_latex(
    # x: pd.DataFrame | Styler,
    df: pd.DataFrame,
    /,
    *,
    column_format: str | None = None,
    label: str,
    caption: str,
    position: Literal["t", "b", "h", "H"] = "t",
    centering: bool = True,
    na_rep: str = r"{\textemdash}",
    precision: int = 2,
    escape_cells: bool = True,
    escape_columns: bool = True,
    escape_index: bool = True,
    hide_columns: bool = False,
    hide_index: bool = False,
    index_name: str | None | Literal[True] = True,
    columns_name: str | None | Literal[True] = None,
    multirow_align: Literal["c", "t", "b", "naive"] | None = "c",
    multicol_align: Literal["r", "c", "l", "naive-l", "naive-r"] | None = "l",
    siunitx: bool | None = None,
    formatters: dict[str, Any] | None = None,
    row_formatters: dict[str, Any] | None = None,
    show: bool = True,
    copy: bool = False,
    fontsize: LatexFontSize = "small",
    convert_css: bool = False,
    col_renamer: dict[str, str] | None = None,
    auto_col_renaming: bool = True,
    apply_style: Callable[[Styler, pd.Index], Styler] | None = None,
    postprocess_output: Callable[[str], str] | None = None,
    hrules: Literal[
        "multiindex-midrules", "multiindex-clines", "all", "off"
    ] = "multiindex-midrules",
):
    # df, style = (x, x.style) if isinstance(x, pd.DataFrame) else (x.data, x)  # type: ignore
    df = df.copy()
    original_df = df.copy()
    original_columns = df.columns.copy()

    def auto_renamer(s: str):
        if s in COMMON_COLUMN_RENAMER:
            return COMMON_COLUMN_RENAMER[s]
        parts = s.split("_")
        parts[0] = parts[0].capitalize()
        return " ".join(parts)

    if col_renamer is None:
        col_renamer = {}
    if auto_col_renaming:
        # Automatically rename columns. Replace "_" by " " and capitalize first word.
        # assert not isinstance(df.columns, pd.MultiIndex)
        if isinstance(df.columns, pd.MultiIndex):
            # Apply auto renamer on single index values (not the tuples)
            names = set().union(
                *[df.columns.get_level_values(level) for level in range(df.columns.nlevels)]
            )
            col_renamer.update({x: auto_renamer(x) for x in names if x not in col_renamer})
        else:
            col_renamer.update(
                {col: auto_renamer(col) for col in df.columns if col not in col_renamer}
            )
    if col_renamer:
        if isinstance(df.columns, pd.MultiIndex):
            # Apply auto renamer on single index values (not the tuples)
            df.columns = pd.MultiIndex.from_tuples(
                [tuple(col_renamer.get(x, x) for x in tup) for tup in df.columns.tolist()]
            )
        else:
            df = df.rename(columns=col_renamer, errors="ignore")
        if isinstance(formatters, dict):
            assert not isinstance(df.columns, pd.MultiIndex)
            formatters = {col_renamer.get(col, col): f for col, f in formatters.items()}
    style = df.style
    index = df.index

    if siunitx is True and column_format is not None:
        raise ValueError
    if siunitx is None:
        siunitx = True
    if columns_name is not None:
        raise NotImplementedError(
            "Currently only index name can be shown. Pass column_name=None (default). To keep the columns name, pass index_name=df.columns.name"
        )

    if index_name is True and df.index.name is None and df.columns.name is not None:
        index_name = df.columns.name
    if index_name is True:
        index_name = df.index.name
    if index_name == "":
        index_name = None
    if isinstance(index_name, str) and auto_col_renaming:
        index_name = auto_renamer(index_name)
    reset_index = index_name is not None

    if index_name is not True:
        df.index.name = index_name
    if reset_index:
        df.reset_index(inplace=True)
        df.index.name = None
        style = df.style.hide(axis="index")
    elif hide_index:
        style = style.hide(axis="index")
    if escape_index:
        style = style.format_index(escape="latex", axis="index")

    if escape_columns:
        style = style.format_index(escape="latex", axis="columns")
    elif hide_columns:
        style = style.hide(axis="columns")

    if apply_style is not None:
        style = apply_style(style, original_columns)

    # Format content
    formatters = formatters or {}
    assert apply_style is None or not formatters

    # Auto-detect NumSeriesAgg columns
    if apply_style is None:
        numagg_cols = [
            col for col in df.columns if df[col].apply(lambda x: isinstance(x, NumSeriesAgg)).any()
        ]
        if numagg_cols:
            assert not formatters or set(numagg_cols).isdisjoint(formatters.keys())
            numagg_formatter = lambda numagg: numagg.to_latex()
            if formatters is None:
                formatters = {}
            formatters.update({col: numagg_formatter for col in numagg_cols})

    if apply_style is None:
        style = style.format(
            formatters, na_rep=na_rep, precision=precision, escape="latex" if escape_cells else None
        )
    if row_formatters is not None:
        style = style.pipe(
            format_row_wise, row_formatters, index=index, offset=1 if reset_index else 0
        )

    if not label.startswith("tab:"):
        label = "tab:" + label

    clines = None
    if hrules == "multiindex-clines":
        clines = "skip-last;data"
    elif hrules == "all":
        clines = "all;data"

    # column_align = [getattr(original_df[col], "_align", None) for col in original_df.columns]
    # print(", ".join([str(x) for x in column_align]))
    # if column_format is None and all(column_align):
    #     column_format = "".join([str(x) for x in column_align])

    latex = style.to_latex(
        column_format=column_format,  # example "llll"
        position=position,  # [str] The LaTeX positional argument for tables
        position_float=(
            "centering" if centering else None
        ),  # {"centering", "raggedleft", "raggedright"} or None
        hrules=hrules != "off",
        clines=clines,
        label=label,  # [str] The LaTeX label to be placed inside \label{{}} in the output. This is used with \ref{{}} in the main .tex file.
        caption=caption,  # [str | tuple] If string, the LaTeX table caption included as: \caption{<caption>}. If tuple, i.e (“full caption”, “short caption”), the caption included as: \caption[<caption[1]>]{<caption[0]>}.
        sparse_index=True,
        sparse_columns=True,
        multirow_align=multirow_align,
        multicol_align=multicol_align,
        siunitx=siunitx,
        environment="table",  # or "longtable"
        convert_css=convert_css,
    )

    # LaTeX post-processing

    if hrules == "multiindex-midrules":
        # Add \midrule for MultiIndex
        latex = re.sub(r"\\\\ *%?[^\n]*\n *\\multirow", r"\\\\%\n\\midrule%\n\\multirow", latex)

    lines = latex.split("\n")
    lines_pre_tabular = []
    if fontsize != "normal":
        lines_pre_tabular.append(size_cmd(fontsize))
    begin_tabular_index, end_tabular_index = tuple(
        i
        for i, line in enumerate(lines)
        if line.lstrip().startswith("\\begin{tabular}")
        or line.rstrip().startswith("\\end{tabular}")
    )
    lines = lines[:begin_tabular_index] + lines_pre_tabular + lines[begin_tabular_index:]

    # Custom post-processing in tabular contents (string replacing etc.)
    if postprocess_output is not None:
        lines_before_tabular = lines[:begin_tabular_index]
        lines_in_tabular = lines[begin_tabular_index : end_tabular_index + 1]
        lines_after_tabular = lines[end_tabular_index + 1 :]

        latex_in_tabular = "\n".join(lines_in_tabular)
        latex_in_tabular = postprocess_output(latex_in_tabular)
        lines_in_tabular = latex_in_tabular.split("\n")
        lines = lines_before_tabular + lines_in_tabular + lines_after_tabular

    # Filter out erroneous CSS output
    lines = [
        line
        for line in lines
        if not line.strip().startswith("\\tbody") and not line.strip().startswith("\\ tr")
    ]

    # Move index names to column titles row
    # if not hide_index and not hide_columns:
    #     i_coltitles = [i for i, line in enumerate(lines) if re.match(rf"^\s*(&  ){}")]
    # "&  &"

    latex = indent_latex("\n".join(lines))

    if copy:
        set_clipboard(latex)
    if show:
        print(latex)
    else:
        return latex


def style_multiindex(df: pd.DataFrame | Styler):  # type: ignore
    slight_border = ".5px solid rgba(255, 255, 255, .25)"
    strong_border = "3px solid rgba(255, 255, 255, .5)"
    no_background = "#1f1f1f"

    style = df.style if isinstance(df, pd.DataFrame) else df
    return style.set_table_styles(
        [
            {
                "selector": "tbody tr:first-child, tr:has(th[rowspan].level0)",
                "props": [("border-top", strong_border)],
            },
            {
                "selector": "tbody tr:last-child",
                "props": [("border-bottom", strong_border)],
            },
            # {"selector": "tr th[rowspan]", "props": [("background", no_background)]},
            {"selector": "tbody tr", "props": [("border-top", slight_border)]},
            {"selector": "tbody tr:last-child", "props": [("border-bottom", slight_border)]},
        ]
    )
