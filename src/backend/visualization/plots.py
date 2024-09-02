from typing import Any, Callable, Literal

import matplotlib.lines as mlines
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from api.logger import logger
from util.misc import all_or_none, exactly_one
from visualization.constants import *

LEGEND_ABOVE_TITLE_OFFSET = 0.1


def in_to_cm(x):
    return x * 2.54


def cm_to_in(x):
    return x / 2.54


# matplotlib font size config
# plt.rc("font", size=8)
# https://stackoverflow.com/a/39566040/15936336
SMALL_SIZE = 8
MEDIUM_SIZE = 9
BIGGER_SIZE = 10

plt.rc("font", size=SMALL_SIZE)  # controls default text sizes
plt.rc("axes", titlesize=MEDIUM_SIZE)  # fontsize of the axes title
plt.rc("axes", labelsize=MEDIUM_SIZE)  # fontsize of the x and y labels
plt.rc("xtick", labelsize=SMALL_SIZE)  # fontsize of the tick labels
plt.rc("ytick", labelsize=SMALL_SIZE)  # fontsize of the tick labels
plt.rc("legend", fontsize=SMALL_SIZE)  # legend fontsize
plt.rc("figure", titlesize=MEDIUM_SIZE)  # fontsize of the figure title


def figure(
    *,
    width: float | None = None,
    height: float | None = None,
    aspect: float | None = None,
    subfigures: int | Literal[False] = False,
):
    """Creates a figure of recommended size. Units in centimeters!"""
    # has_width, has_height, has_aspect = width is not None, height is not None, aspect is not None
    textwidth = 21 - 3.5 - 2.5
    if subfigures:
        assert subfigures >= 2 and subfigures <= 3
        if not width:
            width = (1 - 0.025 / (subfigures - 1)) / subfigures
    if width:
        if width <= 1:
            width = width * textwidth
    assert width or height
    if exactly_one([width, height]):
        if not aspect:
            default_aspect = 4 / 3
            aspect = default_aspect
        if height and not width:
            width = height * aspect  # type: ignore
        if width and not height:
            height = width / aspect  # type: ignore

    assert width and height
    return plt.figure(
        figsize=(cm_to_in(width), cm_to_in(height)),
    ), (width, height)


def thousands_tick_formatter(x: float, pos: float):
    k = x // 1000
    assert np.isclose(k, x / 1000)
    return str(int(k)) + "k"


def set_log_runtime_ticks(axis: Literal["x", "y"] = "y"):
    """Sets ticks for log scale runtime. Limits are between .1 seconds and 4 minutes."""
    setticks = plt.yticks if axis == "y" else plt.xticks
    setticks(
        [0.1, 1, 10, 60, 240],
        labels=["0.1 s", "1 s", "10 s", "1 min", "4 min"],
        minor=False,
    )
    setticks(
        [
            *np.arange(0.1, 1, step=0.1),
            *np.arange(1, 10),
            *np.arange(10, 60, step=10),
            60,
            120,
            180,
            240,
        ],
        labels=[],
        minor=True,
    )


def colored_scatter(
    x: pd.Series,
    y: pd.Series,
    labels: pd.Series,
    label_order: list[str] | None = None,
    label_map: dict[str, str] | None = None,
    color_map: dict[str, str] | None = None,
    marker_map: dict[str, str] | None = None,
    marker: str | None = None,
    **kwargs,
):
    """Only one legend dimension. Can specify colors and markers, but the labels are one-dimensional."""
    values = label_order or labels.unique().tolist()
    if len(values) > 10:
        logger.warning(f"Many label values ({len(values)}) encountered in colored_scatter().")
    for value in values:
        ix = labels == value
        if not ix.any():
            continue
        xi, yi = x[ix], y[ix]
        if not (xi.notna() & yi.notna()).any():
            continue
        label = label_map.get(value, value) if label_map else value
        color = color_map.get(value, value) if color_map else None
        marker = marker_map.get(value, value) if marker_map else marker
        plt.scatter(xi, yi, c=color, label=label, marker=marker, **kwargs)


def colored_marked_scatter(
    x: pd.Series,
    y: pd.Series,
    color_labels: pd.Series,
    marker_labels: pd.Series,
    label_order: list[str] | None = None,
    label_map: dict[str, str] | None = None,
    color_map: dict[str, str] | None = None,
    marker_map: dict[str, dict[str, Any]] | None = None,
    joint_legend: bool = False,
    color_legend: bool = False,
    marker_legend: bool = False,
    legend_pos: Literal["above"] | None = "above",
    legend_x0: float = 0,
    legend_x1: float = 1,
    **kwargs,
):
    """Colors and markers indicate two different parameter dimensions."""
    cvalues = color_labels.unique().tolist()
    mvalues = marker_labels.unique().tolist()
    if label_order:
        label_order += cvalues + mvalues
        cvalues = sorted(cvalues, key=label_order.index)  # type: ignore
        mvalues = sorted(mvalues, key=label_order.index)  # type: ignore

    if len(cvalues) > 10:
        logger.warning(
            f"Many color label values ({len(cvalues)}) encountered in colored_marked_scatter()."
        )
    if len(mvalues) > 10:
        logger.warning(
            f"Many marker label values ({len(cvalues)}) encountered in colored_marked_scatter()."
        )

    color_legend_entries = {}
    marker_legend_entries = {}

    for cvalue in cvalues:
        color = color_map.get(cvalue, cvalue) if color_map else None
        clabel = label_map.get(cvalue, cvalue) if label_map else cvalue
        color_legend_entries[cvalue] = (color, clabel)
        for mvalue in mvalues:
            ix = (color_labels == cvalue) & (marker_labels == mvalue)
            if not ix.any():
                continue
            xi, yi = x[ix], y[ix]
            if not (xi.notna() & yi.notna()).any():
                continue
            marker_kwargs = {}
            if marker_map:
                marker_kwargs = marker_map.get(mvalue, None)
                if marker_kwargs is None:
                    raise ValueError(f"Marker settings not found for value '{mvalue}'")
                if mvalue not in marker_legend_entries:
                    mlabel = label_map.get(mvalue, mvalue) if label_map else mvalue
                    marker_legend_entries[mvalue] = (marker_kwargs, mlabel)
            plt.scatter(xi, yi, c=color, **marker_kwargs, **kwargs)

    fig, ax = plt.gcf(), plt.gca()
    if legend_pos is not None and joint_legend or marker_legend or color_legend:
        _pos_args = []
        if legend_pos == "above":
            title_offset = LEGEND_ABOVE_TITLE_OFFSET if ax.get_title() else 0
            _pos_args = [
                dict(loc="lower left", bbox_to_anchor=(legend_x0, 1 + title_offset)),
                dict(loc="lower right", bbox_to_anchor=(legend_x1, 1 + title_offset)),
            ]

        marker_order = ["s", "o", "D"]
        color_legend_marker = [
            m
            for m in marker_order
            if not any(mkw["marker"] == m for mkw, _ in marker_legend_entries.values())
        ][0]
        marker_legend_color = "gray"

        legend_keys = []
        if color_legend:
            legend_keys.append("color")
        if marker_legend:
            legend_keys.append("marker")

        for legend_key, pos_args in zip(legend_keys, _pos_args):
            legends = []
            if legend_key == "joint":
                raise NotImplementedError
            if legend_key == "color":
                items = [
                    # mpatches.Patch(color=c, linewidth=0.1)
                    mlines.Line2D(
                        [0],
                        [0],
                        marker=color_legend_marker,
                        color="w",
                        markerfacecolor=c,
                        markersize=8,
                    )
                    for c, _ in color_legend_entries.values()
                ]
                legends.append(
                    plt.legend(
                        items,
                        [l for _, l in color_legend_entries.values()],
                        ncol=2,
                        handletextpad=0.4,
                        columnspacing=0.6,
                        **pos_args,
                    )
                )
            if legend_key == "marker":
                items = [
                    mlines.Line2D(
                        [0],
                        [0],
                        **mkw,
                        color="w",
                        markerfacecolor=marker_legend_color,
                        markersize=8,
                    )
                    for mkw, _ in marker_legend_entries.values()
                ]
                legends.append(
                    plt.legend(
                        items,
                        [l for _, l in marker_legend_entries.values()],
                        handletextpad=0.4,
                        **pos_args,
                    )
                )
            for legend in legends:
                fig.add_artist(legend)


def scatter_stats(
    stats: pd.DataFrame,
    xstat: Callable[..., float],
    ystat: Callable[..., float],
    *,
    label_col: str | None = None,
    color_col: str | None = None,
    marker_col: str | None = None,
    label_order: list[str] | None = None,
    label_map: dict[str, str] | None = None,
    color_map: dict[str, str] | None = None,
    marker_map: dict[str, dict[str, Any]] | None = None,
    joint_legend: bool = False,
    color_legend: bool = False,
    marker_legend: bool = False,
    legend_pos: Literal["above"] | None = "above",
    legend_x0: float = 0,
    legend_x1: float = 1,
    **kwargs,
):
    assert label_col is None or (color_col is None and marker_col is None)
    assert all_or_none([color_col is None, marker_col is None])

    stats = stats.reset_index()

    x = stats[xstat.__name__]
    y = stats[ystat.__name__]
    assert (x.index == y.index).all()

    if label_col is None and color_col is None and marker_col is None:
        plt.scatter(
            x=x,
            y=y,
            **kwargs,
        )
    elif label_col is not None:
        # if label_col == "graph_mode":
        #     label_order = ["Obj-Obj", "HU-HU"]
        #     color_map = {"HU-HU": HU_COLOR, "Obj-Obj": RESOURCE_COLOR}
        #     label_map = {"HU-HU": "CTHU", "Obj-Obj": "CT"} | label_map
        labels = stats[label_col]
        assert legend_pos is None
        colored_scatter(
            x=x,
            y=y,
            labels=labels,
            color_map=color_map,
            label_map=label_map,
            label_order=label_order,
            **kwargs,
        )
    else:
        assert color_col is not None and marker_col is not None
        if label_order is None:
            label_order = []
        # if color_col == "graph_mode":
        #     label_order = ["Obj-Obj", "HU-HU"] + label_order
        #     color_map = {"HU-HU": HU_COLOR, "Obj-Obj": RESOURCE_COLOR}
        #     label_map = {"HU-HU": "CTHU", "Obj-Obj": "CT"}
        # if marker_col == "ocel":
        #     label_order = ["Obj-Obj", "HU-HU"] + label_order
        #     marker_map = {
        #         "orderManagementWithDistances": ">",
        #         "containerLogistics": "s",
        #         "p2p": "P",
        #         "hinge": "d",
        #     }
        #     label_map = {"HU-HU": "CTHU", "Obj-Obj": "CT"}
        colored_marked_scatter(
            x=x,
            y=y,
            color_labels=stats[color_col],
            color_map=color_map,
            marker_labels=stats[marker_col],
            marker_map=marker_map,
            label_map=label_map,
            label_order=label_order,
            joint_legend=joint_legend,
            color_legend=color_legend,
            marker_legend=marker_legend,
            legend_pos=legend_pos,
            legend_x0=legend_x0,
            legend_x1=legend_x1,
            **kwargs,
        )

    plt.xlabel(xstat.__name__)
    plt.ylabel(ystat.__name__)


def filled_plot(
    x,
    y,
    *,
    label: str,
    color,
    fill_alpha,
):
    plt.plot(x, y, label=label, color=color)
    plt.fill_between(x, y, 0, label=label, color=color, alpha=fill_alpha)


def centered_hist(arr):
    labels, counts = np.unique(arr, return_counts=True)
    plt.bar(labels, counts, align="center", log=True)
    plt.gca().set_xticks(labels)
