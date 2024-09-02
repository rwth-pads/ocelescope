from __future__ import annotations

from typing import TYPE_CHECKING, Callable

import pandas as pd

import util.pandas as pd_util
from emissions import allocation

OVERALL = "(OVERALL)"


def targets_per_act_and_dist(alloc: allocation.Allocator, num_targets_per_event: pd.DataFrame):
    """
    Requires `num_targets_per_event`

    **Assumes all events have emissions!**

    **ClosestTargets** only

    Index: ocel:activity, distance

    Columns:
    - num_events (num_events, rel_num_events)
    - num_targets_per_event (mean, min, 50%, max)
    - rel_num_targets_per_event (mean, min, 50%, max)
    """

    num_targets = len(alloc.target_oids)
    num_events = len(alloc.ocel.events)

    # num_targets_per_event.rename(columns={"obj_dist": "distance"}, inplace=True)
    if "ocel:activity" not in num_targets_per_event.columns:
        num_targets_per_event["ocel:activity"] = num_targets_per_event["ocel:eid"].map(
            alloc.ocel.event_activities
        )

    # ---------------------------------------------------------------------
    # Number of events per activity and distance
    act_dist_groups = num_targets_per_event.groupby(["ocel:activity", "distance"], dropna=False)
    num_ev_per_act_and_dist = act_dist_groups.size().rename("num_events").to_frame()  # type: ignore

    act_freqs = num_ev_per_act_and_dist.index.to_frame()["ocel:activity"].map(
        alloc.ocel.activity_counts
    )
    num_ev_per_act_and_dist["rel_num_events"] = num_ev_per_act_and_dist["num_events"] / act_freqs

    # Number of targets per event (mmmm)
    agg_num_targets_per_act_and_dist: pd.DataFrame = act_dist_groups["num_targets"].pipe(pd_util.mmmm, dtype=int)  # type: ignore

    # Relative numbers of targets
    assert {"mean", "min", "50%", "max"}.issuperset(agg_num_targets_per_act_and_dist.columns)
    agg_rel_num_targets_per_act_and_dist = agg_num_targets_per_act_and_dist / num_targets

    stats_per_act_and_dist = pd.concat(
        [
            pd_util.prepend_level(num_ev_per_act_and_dist, "num_events"),
            pd_util.prepend_level(agg_num_targets_per_act_and_dist, "num_targets_per_event"),
            pd_util.prepend_level(
                agg_rel_num_targets_per_act_and_dist, "rel_num_targets_per_event"
            ),
        ],
        axis=1,
    )  # type: ignore

    # -------------------------------------
    # Repeat for (any activity, groupby distance)
    # -------------------------------------

    # Number of events per activity and distance
    dist_groups = num_targets_per_event.groupby("distance", dropna=False)
    num_ev_overall_per_dist = dist_groups.size().rename("num_events").to_frame()  # type: ignore
    num_ev_overall_per_dist["rel_num_events"] = num_ev_overall_per_dist["num_events"] / num_events

    # Number of targets per event (mmmm)
    agg_num_targets_overall_per_dist: pd.DataFrame = dist_groups["num_targets"].pipe(pd_util.mmmm, dtype=int)  # type: ignore

    # Relative numbers of targets
    assert {"mean", "min", "50%", "max"}.issuperset(agg_num_targets_overall_per_dist.columns)
    agg_rel_num_targets_overall_per_dist = agg_num_targets_overall_per_dist / num_targets

    stats_overall_per_dist = pd.concat(
        [
            pd_util.prepend_level(num_ev_overall_per_dist, "num_events"),
            pd_util.prepend_level(agg_num_targets_overall_per_dist, "num_targets_per_event"),
            pd_util.prepend_level(
                agg_rel_num_targets_overall_per_dist, "rel_num_targets_per_event"
            ),
        ],
        axis=1,
    )  # type: ignore

    # -------------------------------------
    # Repeat for (any activity, any distance)
    # -------------------------------------

    # Number of events per activity and distance
    _num_ev_overall = len(num_targets_per_event)
    _rel_num_ev_overall = _num_ev_overall / num_events
    num_ev_overall = pd.Series(
        {"num_events": _num_ev_overall, "rel_num_events": _rel_num_ev_overall}
    )

    # Number of targets per event (mmmm)
    agg_num_targets_overall: pd.Series = num_targets_per_event["num_targets"].pipe(pd_util.mmmm, dtype=int)  # type: ignore

    # Relative numbers of targets
    assert {"mean", "min", "50%", "max"}.issuperset(agg_num_targets_overall.index)
    agg_rel_num_targets_overall = agg_num_targets_overall / num_targets

    stats_overall = (
        pd.concat(
            [
                pd_util.prepend_level(num_ev_overall, "num_events", axis=0),
                pd_util.prepend_level(agg_num_targets_overall, "num_targets_per_event", axis=0),
                pd_util.prepend_level(
                    agg_rel_num_targets_overall, "rel_num_targets_per_event", axis=0
                ),
            ],
            axis=0,
        )  # type: ignore
        .to_frame()
        .transpose()
    )  # type: ignore
    stats_overall.index = pd.MultiIndex.from_tuples(
        [(OVERALL, OVERALL)], names=["ocel:activity", "distance"]
    )

    return pd.concat(
        [
            stats_per_act_and_dist,
            pd_util.prepend_level(stats_overall_per_dist, OVERALL, name="ocel:activity", axis=0),
            stats_overall,
        ]
    )


targets_per_act_and_dist._formatters = {
    (a, b): "{:.0%}"
    for a, b in [
        ("num_events", "rel_num_events"),
        ("rel_num_targets_per_event", "mean"),
        ("rel_num_targets_per_event", "min"),
        ("rel_num_targets_per_event", "50%"),
        ("rel_num_targets_per_event", "max"),
    ]
}


def format(df: pd.DataFrame, stat: Callable):
    if hasattr(stat, "_formatters"):
        return df.style.format(stat._formatters)
    else:
        return df.style
