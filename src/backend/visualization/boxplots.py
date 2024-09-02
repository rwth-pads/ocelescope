from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


def category_boxplots(
    df: pd.DataFrame,
    /,
    features: list[str],
    categories: list[str],
    *,
    category_col: str,
    feature_labels: dict[str, str],
    feature_colors: dict[str, Any],
    value_margin: float = 0,
    category_margin: float = 0.25,
    feature_margin: float = 0,
    vert: bool = True,
    **kwargs,
):
    """Plots boxplots of a dataset, grouping the data by a specified column (*category*) and displaying multiple *features*."""
    # feature_offsets = dict(zip(features, np.arange(len(features)) / len(features) * (1 - category_margin) - .5 + category_margin / 2))
    offsets = {}
    level_assignments = {}
    data = {
        (cat, feature): df[df[category_col] == cat][feature]
        for feature in features
        for cat in categories
    }

    # Compute assignment of features to minimum number of levels in each category
    for cat in categories:
        feature_min_max = [
            (
                data[(cat, feature)].min() - value_margin / 2,
                data[(cat, feature)].max() + value_margin / 2,
            )
            for feature in features
        ]
        level_assignments[cat] = assign_interval_levels(feature_min_max)
    max_num_levels = max([len(levels) for labels, levels in level_assignments.values()])
    feature_width = (1 - category_margin) / max_num_levels
    box_width = (1 - feature_margin) * feature_width

    for cat, (labels, levels) in level_assignments.items():
        for i, feature in enumerate(features):
            lvl, nlevels = labels[i], len(levels)
            offsets[(cat, feature)] = lvl * box_width - (nlevels - 1) * box_width / 2
    # display(np.array(list(offsets.values())).reshape((len(categories), len(features))))

    feature_plots = {}
    for feature in features:
        feature_plots[feature] = plt.boxplot(
            [data[(cat, feature)] for cat in categories],
            vert=vert,
            positions=np.array([i + offsets[(cat, feature)] for i, cat in enumerate(categories)]),
            widths=box_width,
            **kwargs,
        )

    def set_feature_properties(plots, label, color, **kwargs):
        for k, plot in plots.items():
            plt.setp(plot, color=color, **kwargs)
        plt.plot([], c=color, label=label)
        plt.legend()

    for feature, plot in feature_plots.items():
        set_feature_properties(plot, label=feature_labels[feature], color=feature_colors[feature])

    (plt.xticks if vert else plt.yticks)(np.arange(len(categories)), categories)
    (plt.xlim if vert else plt.ylim)(-0.5, len(categories) - 0.5)
    if not vert:
        plt.gca().invert_yaxis()
    plt.show()


def assign_interval_levels(intervals: list[tuple[float, float]]):
    """Assigns intervals given as a list of (min, max) pairs to a minimum number of levels s.t. intervals in the same level are non-overlapping.
    Also refered to as the 'interval scheduling problem.'"""
    sorted_intervals = list(sorted(list(enumerate(intervals)), key=lambda t: (t[1][0], t[1][1])))

    labels = [0 for _ in intervals]  # Assignment of interval data index to level index
    levels = []  # Levels represented by lists of intervals assigned to them

    for i, (x0, x1) in sorted_intervals:
        placed = False
        # Try to place the interval in an existing level
        for j, level in enumerate(levels):
            if (
                level[-1][1] < x0
            ):  # If the last interval in the level does not overlap with the current interval
                level.append((x0, x1))
                labels[i] = j
                placed = True
                break
        # If the interval was not placed in any existing level, create a new level
        if not placed:
            levels.append([(x0, x1)])
            labels[i] = len(levels) - 1

    # Sort (relabel) levels by minimum original data index
    level_order = sorted(range(len(levels)), key=lambda j: labels.index(j))
    level_map = dict(zip(level_order, range(len(levels))))
    labels = [level_map[label] for label in labels]
    levels = [levels[level_order[j]] for j in range(len(levels))]

    return labels, levels

    # # Example intervals
    # intervals = [
    #     [1, 4], [2, 6], [8, 10], [3, 5], [7, 9], [11, 12]
    # ]
    # labels, levels = assign_interval_levels(intervals)
    # print(labels)
    # print(levels)
