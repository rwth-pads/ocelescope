import datetime
import getpass
import os
import uuid
from pathlib import Path
from typing import Any, Literal, TypeAlias, TypeVar

import graphviz as gv  # type: ignore
import matplotlib.pyplot as plt  # type: ignore
import numpy as np
import pandas as pd  # type: ignore

import util.pandas as pd_util
from api.config import config
from api.logger import logger
from emissions.allocation_graph import GraphMode
from util.jupyter import set_clipboard
from util.latex import indent_latex
from util.types import NestedDict, PathLike

OUTPUT_DIR = config.DATA_DIR / "evaluation" / "output"
OUTPUT_META_FILE = OUTPUT_DIR / "meta.csv"
META_CONFIG = dict(sep=";", decimal=",")


def make_filename(
    name: str,
    format: str,
    *,
    ocel_key: str | None,
    name_suffix: str | None = None,
    graph_mode: GraphMode | None = None,
):
    t = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    graph_mode_str = f"{graph_mode:file}" if graph_mode else None
    full_name = "-".join(
        [str(s) for s in [ocel_key, name, name_suffix, graph_mode_str] if s is not None]
    )
    code = str(uuid.uuid4())[:8]
    filename = f"{t}-{full_name}-{code}.{format}"
    return filename, t


def load_ocel_stats(
    name: str,
    *,
    min_timestamp: datetime.datetime | None = None,
    decimal: str = ",",
    sep: str = ";",
    dt_warning: datetime.timedelta | None = datetime.timedelta(minutes=30),
    load: bool = True,
    replace: dict[str, dict[str, str]] | None = None,
    **kwargs,
) -> tuple[
    NestedDict[str, pd.DataFrame] | None,
    pd.DataFrame,
    tuple[datetime.datetime, datetime.datetime],
]:
    """Loads DataFrames that have been exported to the output directory. Filters them using the meta.csv table."""
    meta_df: pd.DataFrame = pd.read_csv(OUTPUT_META_FILE, **META_CONFIG)  # type: ignore
    meta_df["timestamp"] = pd.to_datetime(meta_df["timestamp"])
    apply_filter = lambda col, value: (
        meta_df[col].isin(value) if isinstance(value, list) else meta_df[col] == str(value)
    )
    # Filter for name
    filters = meta_df["name"] == name

    # Filter for minimum timestamp
    if min_timestamp is not None:
        filters &= meta_df["timestamp"] >= min_timestamp

    # Filter for OCEL key(s)
    try:
        ocel_key = kwargs.pop("ocel_key")
    except KeyError:
        ocel_key = None
    keys = ["ocel"]
    if ocel_key is not None:
        filters &= apply_filter("ocel", ocel_key)

    # Filter for additional metadata
    meta = {col: value for col, value in kwargs.items() if col in meta_df.columns}
    for col, value in meta.items():
        kwargs.pop(col)
        if col not in keys:
            keys.append(col)
        if value is not None:
            filters &= apply_filter(col, value)

    # Apply filters and keep only latest (w.r.t. filter columns)
    meta_df = meta_df[filters]  # type: ignore
    if meta_df.empty:
        raise ValueError("No exported files match the specified filters.")

    meta_df = meta_df.drop_duplicates(subset=keys, keep="last")
    meta_df = meta_df[meta_df.columns[meta_df.notna().any()]]  # type: ignore
    existing_keys = [col for col in keys if col in meta_df.columns]
    meta_df[existing_keys] = meta_df[existing_keys].replace([np.nan], [None])

    for col, replacer in (replace or {}).items():
        meta_df[col] = meta_df[col].replace(replacer)

    last_cols = ["filename", "name_suffix"]
    col_order = [
        "timestamp",
        "user",
        "name",
        *keys,
        *[col for col in meta_df.columns if col not in last_cols],
        *last_cols,
    ]
    meta_df = meta_df[sorted(meta_df.columns, key=col_order.index)]  # type: ignore

    t0, t1 = meta_df["timestamp"].min(), meta_df["timestamp"].max()
    if dt_warning is not None and (t1 - t0) >= dt_warning:
        logger.warning(
            f"load_ocel_stats encountered tables with timestamps further apart than {dt_warning}"
        )

    def get_path(filename: str, ocel_key: str | None):
        if ocel_key is None:
            return OUTPUT_DIR / "stats" / filename
        return OUTPUT_DIR / "ocel_stats" / ocel_key / filename

    if load:
        dfs = [
            pd.read_csv(
                get_path(filename=row["filename"], ocel_key=row["ocel"]),  # type: ignore
                index_col=[0],
                decimal=decimal,
                sep=sep,
                **kwargs,
            )  # type: ignore
            for i, row in meta_df.iterrows()
        ]
        for (i, row), df in zip(meta_df.iterrows(), dfs):
            object.__setattr__(df, "meta", row.to_dict())

        key_index = meta_df.set_index(existing_keys)["filename"]
        dfs_dict = pd_util.series_to_nested_dict(key_index, values=dfs)
    else:
        dfs_dict = None

    return dfs_dict, meta_df, (t0, t1)


StatsExportName = Literal[
    "alloc_target_emissions",
    "alloc_report",
    "object_target_distances",
    "targets_per_act_and_dist",
    "alloc_event_stats",
    "alloc_object_stats",
]


def save_ocel_stats(
    df: pd.DataFrame,
    /,
    name: StatsExportName,
    *,
    ocel_key: str | None,
    name_suffix: str | None = None,
    format: str = "csv",
    output: bool = True,
    description: str | None = None,
    meta: dict[str, Any] | None = None,
    decimal: str = ",",
    sep: str = ";",
    **kwargs,
):
    if ocel_key is None:
        dir = OUTPUT_DIR / "stats"
    else:
        dir = OUTPUT_DIR / "ocel_stats" / ocel_key
    if not os.path.exists(dir):
        os.mkdir(dir)

    if format != "csv":
        raise NotImplementedError
    filename, t = make_filename(
        name=name,
        format=format,
        ocel_key=ocel_key,
        name_suffix=name_suffix,
    )

    num_rows, num_cols = len(df.index), len(df.columns)
    df.to_csv(
        dir / filename,
        decimal=decimal,
        sep=sep,
        **kwargs,
    )
    # Write metadata
    meta_df = pd.DataFrame(
        [
            dict(
                timestamp=t,
                name=name,
                ocel=ocel_key,
                filename=filename,
                name_suffix=name_suffix,
                num_rows=num_rows,
                num_cols=num_cols,
                **(meta or {}),
                description=description,
                user=getpass.getuser(),
            )
        ]
    )  # type: ignore
    if os.path.exists(OUTPUT_META_FILE):
        meta_df = pd.concat([pd.read_csv(OUTPUT_META_FILE, **META_CONFIG), meta_df])  # type: ignore
    meta_df.to_csv(OUTPUT_META_FILE, **META_CONFIG, index=False)  # type: ignore
    if output:
        print(f'DataFrame ({num_rows}x{num_cols}) saved to "{filename}".')


def save_ocel_gv(
    GV: gv.Graph | gv.Digraph,
    /,
    name: str,
    *,
    ocel_key: str,
    graph_mode: GraphMode | None = None,
    engine: Literal["dot", "neato"] = "dot",
    format: Literal["pdf", "svg", "png"] = "pdf",
    rankdir: Literal["LR", "TB"] | None = None,
    dry: bool = False,
    show: bool = True,
    copy: bool = True,
    # description: str | None = None,
    # meta: dict[str, Any] | None = None,
    position: Literal["t", "b", "h", "H"] = "t",
    centering: bool = True,
    label: str | None = None,
    caption: str | tuple[str, str] | None = None,
    width: float | str = 0.9,
    **kwargs,
):
    OCEL_DIR = OUTPUT_DIR / "ocel_graphs" / ocel_key
    if not os.path.exists(OCEL_DIR):
        os.mkdir(OCEL_DIR)

    if engine != "dot":
        raise NotImplementedError

    filename, t = make_filename(name=name, format=format, ocel_key=ocel_key, graph_mode=graph_mode)
    if rankdir is not None:
        GV.graph_attr["rankdir"] = rankdir
    if not dry:
        GV.render(
            outfile=OCEL_DIR / filename,
            cleanup=True,
            **kwargs,
        )
        logger.info(f'Graph saved to "{filename}".')
    # Write metadata
    # meta_df = pd.DataFrame(
    #     [
    #         dict(
    #             timestamp=t,
    #             name=name,
    #             ocel=ocel_key,
    #             filename=filename,
    #             num_rows=num_rows,
    #             num_cols=num_cols,
    #             **(meta or {}),
    #             description=description,
    #         )
    #     ]
    # )  # type: ignore
    # if os.path.exists(OUTPUT_META_FILE):
    #     meta_df = pd.concat([pd.read_csv(OUTPUT_META_FILE, **META_CONFIG), meta_df])  # type: ignore
    # meta_df.to_csv(OUTPUT_META_FILE, **META_CONFIG, index=False)  # type: ignore
    # num_nodes, num_edges = len(GV.nodes()), len(GV.edges())
    # if output:
    if show:
        display(GV)  # type: ignore

    print_latex = caption is not None
    if print_latex and not dry:
        # LaTeX output
        latex = latex_figure(
            name=name,
            filename=filename,
            position=position,
            centering=centering,
            label=label,
            caption=caption,
            width=width,
            copy=copy,
        )
        return latex
    if not dry:
        return filename


def save_ocel_plt(
    fig=None,
    *,
    name: str,
    ocel_key: str | None,
    graph_mode: GraphMode | None = None,
    format: Literal["pdf", "svg", "png"] = "pdf",
    dry: bool = False,
    show: bool = True,
    copy: bool = False,
    # description: str | None = None,
    # meta: dict[str, Any] | None = None,
    position: Literal["t", "b", "h", "H"] = "t",
    centering: bool = True,
    label: str | None = None,
    caption: str | tuple[str, str] | None = None,
    width: float | str | None = None,
    subfigure: bool = False,
    **kwargs,
):
    DIR = OUTPUT_DIR / "ocel_figures"
    if ocel_key is not None:
        DIR = DIR / ocel_key
        if not os.path.exists(DIR):
            os.mkdir(DIR)

    filename, t = make_filename(name=name, format=format, ocel_key=ocel_key, graph_mode=graph_mode)
    plt.tight_layout()
    if not dry:
        (plt if fig is None else fig).savefig(
            DIR / filename,
            bbox_inches="tight",
            **kwargs,
        )
    if show:
        plt.show()

    print_latex = caption is not None
    if print_latex and not dry:
        # LaTeX output
        latex = latex_figure(
            name=name,
            filename=filename,
            position=position,
            centering=centering,
            label=label,
            caption=caption,
            width=width,
            subfigure=subfigure,
            copy=copy,
            show=True,
        )
        return filename
    if not dry:
        return filename


def latex_figure(
    name: str,
    filename: PathLike,
    caption: str | tuple[str, str],
    label: str | None = None,
    position: Literal["t", "b", "h", "H"] = "t",
    centering: bool = True,
    width: float | str | None = None,
    subfigure: bool = False,
    copy: bool = False,
    show: bool = True,
):
    if label is None:
        label = f"fig:{name}"
    if not label.startswith("fig:"):
        label = "fig:" + label
    caption_args = (
        f"[{caption[1]}]{{{caption[1]}}}" if isinstance(caption, tuple) else f"{{{caption}}}"
    )
    if width is None:
        width = 0.9 if not subfigure else 0.495
    width_arg = width
    if isinstance(width, (float, int)):
        assert width > 0 and width <= 1
        width_arg = (f"{width:.3f}".lstrip("0") if width < 1 else "") + "\\textwidth"
    centering_str = "\n  \\centering" if centering else ""

    if subfigure:
        env = (
            f"\\begin{{subfigure}}{{{width_arg}}}{centering_str}",
            f"\\end{{subfigure}}",
        )
        graphics_width_arg = "\\textwidth"
    else:
        env = (
            f"\\begin{{figure}}[{position}]{centering_str}",
            f"\\end{{figure}}",
        )
        graphics_width_arg = width_arg

    latex = indent_latex(
        "\n".join(
            [
                env[0],
                f"\\includegraphics[width={graphics_width_arg}]{{figures/{filename}}}",
                f"\\caption{caption_args}",
                f"\\label{{{label}}}",
                env[1],
            ]
        )
    )

    if copy:
        set_clipboard(latex)
    if show:
        print(latex)
    return latex
