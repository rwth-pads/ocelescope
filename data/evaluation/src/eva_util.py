from __future__ import annotations

import inspect
from abc import ABC
from dataclasses import dataclass, field
from typing import Any, Callable, Literal, Type

import emissions.allocation_graph as ag
import emissions.allocation_rules as ar
import numpy as np
import pandas as pd
import util.misc as util
import util.pandas as pd_util
from emissions import allocation
from pandas.io.formats.style import Styler

import data.evaluation.src.result_export as export

RULE_ABBRS = {
    "AllTargets": "AT",
    "ParticipatingTargets": "PT",
    "ClosestTargets": "CT",
}

STATS = {}


def export_alloc_results(
    alloc: allocation.Allocator,
    ocel_key,
    tot,
    rule,
    graph_mode,
    remove_otype_loops,
    *,
    report: bool = False,
    target_emissions: bool = True,
    event_stats: bool = True,
    object_stats: bool = True,
    meta: dict[str, Any] | None = None,
    **kwargs,
):
    name_suffix = f"{tot}_" + get_param_str(
        rule=rule, graph_mode=graph_mode, remove_otype_loops=remove_otype_loops, file=True
    )
    if meta is None:
        meta = {}
    meta.update(kwargs)
    meta.update(
        dict(
            rule=rule,
            target_otypes=util.set_str(alloc.target_otypes),
            graph_mode=graph_mode,
            remove_otype_loops=remove_otype_loops,
            hu_otypes=util.set_str(alloc.hu_otypes),
            resource_otypes=util.set_str(alloc.resource_otypes),
        )
    )
    export_kwargs = dict(
        name_suffix=name_suffix,
        ocel_key=ocel_key,
        meta=meta,
    )
    if target_emissions:
        export.save_ocel_stats(
            alloc.target_emissions.reset_index(),
            name="alloc_target_emissions",
            **export_kwargs,  # type: ignore
        )
    if event_stats:
        assert alloc.event_stats is not None
        export.save_ocel_stats(
            alloc.event_stats,
            name="alloc_event_stats",
            **export_kwargs,  # type: ignore
        )
    if report:
        raise NotImplementedError
    if isinstance(alloc.rule, ar.ClosestTargetsAllocation):
        if object_stats:
            export.save_ocel_stats(
                alloc.rule.object_stats,
                name="alloc_object_stats",
                **export_kwargs,  # type: ignore
            )
        # if object_target_distances and hasattr(alloc.rule.OG, "_object_target_paths"):
        #     export.save_ocel_stats(
        #         alloc.rule.OG._object_target_paths,  # type: ignore
        #         name="object_target_distances",
        #         **meta,  # type: ignore
        #     )


@dataclass(frozen=True)
class AbsAndRel:
    abs: float
    rel: float
    abs_format: str = field(default=".2f", hash=False)
    rel_format: str = field(default=".1%", hash=False)
    all_rel_rep: str | None = field(default=None, hash=False)
    hide_abs: Callable[[float, float], bool] | None = field(default=None, hash=False)
    hide_rel: Callable[[float, float], bool] | None = field(default=None, hash=False)

    def __str__(self):
        hide_abs = self.hide_abs(self.abs, self.rel) if self.hide_abs is not None else False
        hide_rel = self.hide_rel(self.abs, self.rel) if self.hide_rel is not None else False

        abs_str = f"{self.abs:{self.abs_format}}"
        rel_str = f"{self.rel:{self.rel_format}}"
        if self.all_rel_rep is not None and self.rel == 1:
            rel_str = self.all_rel_rep

        if util.all_or_none([hide_abs, hide_rel]):
            return f"{abs_str} ({rel_str})"
        if hide_abs:
            return rel_str
        if hide_rel:
            return abs_str
        raise ValueError

    def __repr__(self):
        return str(self)


class NumberFormat(ABC):
    def __call__(self, x: float) -> str: ...


@dataclass
class FloatFormat(NumberFormat):
    prec: int = 2
    leading_zeros: bool = True
    percentage: bool = False

    def __call__(self, x: float):
        if self.percentage:
            s = f"{x:.{self.prec}%}"
        else:
            s = f"{x:.{self.prec}f}"
        if not self.leading_zeros and s.startswith("0."):
            s = s[1:]
        return s


class PercentageFormat(FloatFormat):
    def __init__(self, prec: int = 1, leading_zeros: bool = True):
        super().__init__(prec=prec, leading_zeros=leading_zeros, percentage=True)


@dataclass
class IntegerFormat(NumberFormat):
    median: bool = False

    def __call__(self, x: float):
        if self.median:
            return pd_util.int_median_str(x)
        return str(np.round(x))


def stat(
    *,
    dtype: Type[float] | Type[int] | Type[AbsAndRel] | Literal["int_median"] = float,
    get_number: Callable[[float | AbsAndRel], float] | Literal["abs", "rel"] | None = None,
    rule: Literal["AT", "PT", "CT"] | None = None,
    drop: list[Literal["AT", "PT", "CT", "CTHU", "CTx", "CTHUx"]] | None = None,
    format: str | Literal["auto"] | NumberFormat = "auto",
    cmap: str | None = None,
    level: list[str] | None = None,
    log_cmap: bool = False,
    highlight: list[tuple[float, str]] = [],
    param_independent: bool = False,
    align: Literal["l", "c", "r", "S"] = "r",
):
    """Decorator for defining an evaluation stat.
    Allows specifying
    - a number format (for df.style.format),
    - a matplotlib color map (for df.style.background_gradient)
    - the param_independent flag (when True, the param columns are expected and asserted to be equal and contracted to one column)
    """

    if dtype == AbsAndRel and get_number is None:
        get_number = "rel"
    if get_number == "abs":
        assert dtype == AbsAndRel
        get_number = lambda x: x.abs  # type: ignore
    if get_number == "rel":
        assert dtype == AbsAndRel
        get_number = lambda x: x.rel  # type: ignore
    if isinstance(format, NumberFormat):
        if isinstance(format, FloatFormat | PercentageFormat):
            dtype = float
        elif isinstance(format, IntegerFormat):
            dtype = int if not format.median else "int_median"

    def _get_numbers(df: pd.DataFrame):
        if get_number is None:
            return df
        return df.map(get_number)

    def decorator(func):
        # @functools.wraps(func)
        # def wrapped(*args):
        #     return func(*args)

        setattr(func, "get_numbers", _get_numbers)
        setattr(func, "dtype", dtype)
        setattr(func, "rule", rule)
        setattr(func, "drop", drop)
        setattr(func, "format", format)
        setattr(func, "cmap", cmap)
        setattr(func, "level", level)
        setattr(func, "log_cmap", log_cmap)
        setattr(func, "highlight", highlight)
        setattr(func, "param_independent", param_independent)
        setattr(func, "align", align)
        STATS[func.__name__] = func
        return func

    return decorator


@stat(param_independent=True, highlight=[(1, "black")])
def num_targets(te):
    return len(te)


@stat(param_independent=True)
def te_sum(te):
    return np.round(te.sum(), 3)


@stat(format=PercentageFormat(prec=0))
def te_rel_nonzero(te):
    return (te.fillna(0) != 0).sum() / len(te)


@stat(cmap="hot", format=FloatFormat(prec=2, leading_zeros=False), drop=["CTx", "CTHUx"])
def te_variation_coeff(te):
    return te.std() / te.mean()


@stat(
    cmap="RdYlGn_r",
    level=["ocel", "target_otypes"],
    log_cmap=True,
    dtype=AbsAndRel,
    get_number="rel",
    drop=["CTx", "CTHUx"],
    align="c",
)
def median_targets_per_event(te, evs):
    median = evs["num_targets"].median()
    return AbsAndRel(
        abs=median,
        rel=median / len(te),
        abs_format=".0f",
        rel_format=".0%",
        hide_abs=lambda abs, rel: rel == 1,
        hide_rel=lambda abs, rel: rel != 1,
        all_rel_rep="all",
    )


@stat(format=PercentageFormat(prec=0), cmap="Greens", drop=["CTx", "CTHUx"])
def num_events_uniquely_allocated(te, evs):
    return (evs["num_targets"] == 1).sum() / len(evs)


@stat(format=PercentageFormat(prec=0), cmap="Reds", drop=["CTx", "CTHUx"])
def num_events_uniformly_allocated(te, evs):
    return (evs["num_targets"] == len(te)).sum() / len(evs)


@stat(format=PercentageFormat(prec=0), cmap="Reds_r", drop=["CTx", "CTHUx"])
def num_events_properly_allocated(te, evs):
    return (evs["num_targets"] != len(te)).sum() / len(evs)


@stat(rule="CT", dtype=int, cmap="viridis", drop=["CTx", "CTHUx"])
def max_object_distance(objs):
    return objs["distance"].max()


@stat(rule="CT", dtype=int, cmap="viridis", drop=["CTx", "CTHUx"])
def max_event_distance(evs):
    return evs["distance"].max()


@stat(rule="CT", format=IntegerFormat(median=True), cmap="Purples")
def median_degree(objs):
    return objs["degree"].median()


@stat(rule="CT", dtype=int, cmap="Purples")
def max_degree(objs):
    return objs["degree"].max()


@stat(rule="CT", format=IntegerFormat(median=True), cmap="Purples")
def median_target_degree(objs):
    tot = objs.meta["target_otypes"]
    return objs[objs["ocel:type"] == tot]["degree"].median()


@stat(rule="CT", dtype=int, cmap="Purples")
def max_target_degree(objs):
    tot = objs.meta["target_otypes"]
    return objs[objs["ocel:type"] == tot]["degree"].max()


@stat(rule="CT", dtype=int, drop=["CTx", "CTHUx"])
def og_nodes(objs):
    return objs.meta.get("og_nodes", None)


@stat(rule="CT", dtype=int, cmap="Oranges")
def og_edges(objs):
    return objs.meta.get("og_edges", None)


@stat(
    rule="CT",
    drop=["CTx", "CTHUx"],
    dtype=int,
    cmap="Greens",
    log_cmap=True,
    highlight=[(1, "A50026")],
)
def og_components(objs):
    return objs.meta.get("og_components", None)


@stat(format="seconds", cmap="Oranges", log_cmap=True)
def init_time(meta):
    return meta["init_time"]


@stat(format="seconds", cmap="Oranges", log_cmap=True)
def process_time(meta):
    return meta["process_time"]


@stat(format="seconds", cmap="Oranges", log_cmap=True)
def total_time(meta):
    return meta["init_time"] + meta["process_time"]


def extract_stats(
    stats: pd.DataFrame,
    funcs: list[Callable],
    param_order: list[str],
    otype_order: list[str],
    ocel_order: list[str],
):
    names = [func.__name__ for func in funcs]

    stats = stats.droplevel("rule")
    stats = stats.droplevel("graph_mode")
    stats = stats.droplevel("remove_otype_loops")
    assert stats.index.names == ["ocel", "target_otypes", "param_str"]

    # Check what stats are constant for all params
    _data = []
    for name, stat in zip(names, funcs):
        values = stats[name]

        # Fix dtype
        if stat.dtype == int:
            if values.notna().all():
                values = values.astype(int)
            else:
                values = values.astype(float)
        elif stat.dtype == float:
            values = values.astype(float)

        # Reshape s.t. parameter settings are in the columns
        unstacked = values.unstack().sort_index(key=pd_util.index_order(param_order), axis=1)
        if stat.rule is not None:
            unstacked = unstacked[[p for p in unstacked.columns if p.startswith(stat.rule)]]
        if stat.drop is not None:
            unstacked.drop(columns=stat.drop, inplace=True)

        # Check if values are the same for all parameters
        is_param_independent = (values.unstack().nunique(axis=1, dropna=False) == 1).all()
        if stat.param_independent and not is_param_independent:
            raise ValueError(
                f"Stat '{name}': Param independence not satisfied! (Expected the same results no matter what parameters are used, got different results)"
            )

        if is_param_independent:
            data = unstacked.iloc[:, 0].rename("")
        else:
            data = unstacked
        data = pd_util.prepend_level(data, name, axis=1)
        _data.append(data)
    results = (
        pd.concat(_data, axis=1)
        .sort_index(key=pd_util.index_order(param_order, subset=["param_str"]))
        .sort_index(key=pd_util.index_order(otype_order, subset=["target_otypes"]))
        .sort_index(key=pd_util.index_order(ocel_order, subset=["ocel"]))
    )
    return results


def minutes_and_seconds(t: float, format: Literal[":", "m-s"] = "m-s"):
    t0 = int(np.ceil(t))
    m, s = t0 // 60, t0 % 60
    if format == "m-s":
        if m == 0:
            return f"{s}s"
        return f"{m}m{s}s"
    elif format == ":":
        return f"{m:02d}:{s:02d}"
    raise ValueError


def seconds_formatter(t: float, prec: int = 0, format: Literal[":", "m-s"] = "m-s"):
    if t < 0:
        raise NotImplementedError("Negative amount of seconds")
    if prec == 0:
        return minutes_and_seconds(t, format=format)
    if t < 1:
        return f"{t:.{prec}f}s"[1:]
    if t < 60:
        return f"{t:.{prec}f}s"
    return minutes_and_seconds(t, format=format)


def style_stats(
    x: pd.DataFrame | Styler,
    columns: pd.MultiIndex | None = None,
    latex: bool = False,
):  # type: ignore
    df, style = (x, x.style) if isinstance(x, pd.DataFrame) else (x.data, x)  # type: ignore

    if columns is None:
        columns = df.columns  # type: ignore
    out_columns = df.columns

    assert isinstance(columns, pd.MultiIndex) and columns.nlevels == 2

    names = list(dict.fromkeys(columns.get_level_values(0)))
    """Stat names of the original results DataFrame"""
    out_names = list(dict.fromkeys(out_columns.get_level_values(0)))
    """Potentially renamed columns of df/style to be returned for formatting"""

    unknown_names = [name for name in names if name not in STATS]
    if unknown_names:
        raise ValueError(f"Unknown stat names: {', '.join(unknown_names)}")
    stats = [STATS[name] for name in names]

    # Apply number format
    formatters = {}
    for name, out_name, stat in zip(names, out_names, stats):
        if isinstance(stat.format, NumberFormat):
            formatters[out_name] = stat.format
        elif stat.dtype == AbsAndRel:
            formatters[out_name] = str

        elif stat.dtype == int:
            formatters[out_name] = "{:.0f}"

        elif stat.dtype == "int_median":
            formatters[out_name] = pd_util.int_median_str

        elif stat.format == "auto":
            assert stat.dtype == float

            values = df[out_name]
            vmin, vmax = values.min(axis=None), values.max(axis=None)

            is_int = pd_util.is_int(values)
            if is_int:
                mode = "int"
                formatters[out_name] = "{:.0f}"
            elif vmin >= 0 and vmax <= 1:
                mode = "percentage"
                formatters[out_name] = "{:.1%}"
            else:
                mode = "float"
                formatters[out_name] = "{:.2f}"
            # print(
            #     f"Auto format for {name}: {'int' if is_int else 'float'}, [{vmin} - {vmax}] --> {mode}"
            # )

        elif stat.format == "seconds":
            formatters[out_name] = seconds_formatter

        else:
            formatters[out_name] = stat.format

    # display(formatters)

    style = style.format(
        {tup: formatters[tup[0]] for tup in out_columns},
        na_rep="---",
    )

    # Apply styles (colormaps and highlighted values)
    for name, out_name, stat in zip(names, out_names, stats):
        if stat.align is not None:
            style = style.set_properties(
                subset=[out_name],
                **{"text-align": stat.align},
            )

        if stat.cmap is not None:
            if stat.level is None:
                gmap = None
                if stat.log_cmap:
                    gmap = np.log(stat.get_numbers(df[[out_name]]))

                style = style.background_gradient(
                    cmap=stat.cmap,
                    subset=[out_name],
                    axis=None,
                    gmap=gmap,
                )
            elif "ocel" in stat.level and "target_otypes" in stat.level:
                for ocel, tot in df.index:
                    gmap = None
                    if stat.log_cmap:
                        gmap = np.log(stat.get_numbers(df.loc[[(ocel, tot)], [out_name]]))

                    style = style.background_gradient(
                        cmap=stat.cmap,
                        subset=([(ocel, tot)], [out_name]),  # type: ignore
                        axis=None,
                        gmap=gmap,
                    )
            else:
                raise ValueError

        for value, color in stat.highlight:
            if stat.dtype == AbsAndRel:
                raise NotImplementedError
            if pd.isna(value):
                style = style.highlight_null(subset=[out_name], color=color)
            else:
                style = style.highlight_between(
                    subset=[out_name], color=color, left=value, right=value
                )

    return style


def exec_alloc_stat(
    stat: Callable[..., int | float],
    *,
    alloc: allocation.Allocator | None = None,
    meta: dict[str, Any] | None = None,
    target_emissions: pd.Series | None = None,
    event_stats: pd.DataFrame | None = None,
    object_stats: pd.DataFrame | None = None,
    report: pd.DataFrame | None = None,
):
    """Applies a given statistic (pass the function) on intermediate allocation results.
    The arguments required by the function are automatically passed based on the given data."""
    argnames = inspect.getfullargspec(stat).args

    data = {
        "alloc": alloc,
        "meta": meta,
        "te": target_emissions,
        "evs": event_stats,
        "objs": object_stats,
        "report": report,
    }

    def get_arg(argname: str):
        if data[argname] is not None:
            return data[argname]
        if alloc is not None:
            if argname == "te":
                return alloc.target_emissions
            if argname == "report":
                return alloc.report
            if argname == "evs":
                return alloc.event_stats
            if argname == "objs":
                # assert isinstance(alloc.rule, ar.ClosestTargetsAllocation)
                if isinstance(alloc.rule, ar.ClosestTargetsAllocation):
                    return alloc.rule.object_stats
        if argname == "meta":
            if target_emissions is not None:
                return target_emissions.meta
            if event_stats is not None:
                return event_stats.meta
            if report is not None:
                return report.meta
        return None

    args = []

    for argname in argnames:
        arg = get_arg(argname)
        if arg is None:
            if argname == "objs":
                return None
            raise ValueError(f"Stats argument '{argname}' is None.")
        args.append(arg)

    return stat(*args)


def compute_alloc_stat(
    stat: Callable,
    *,
    params: list[str],
    _target_emissions: dict[tuple, pd.Series],
    _event_stats: dict[tuple, pd.DataFrame],
    _object_stats: dict[tuple, pd.DataFrame],
) -> pd.DataFrame:
    assert _target_emissions.keys() == _event_stats.keys()
    stats = {
        param_tuple: exec_alloc_stat(
            stat,
            target_emissions=_target_emissions[param_tuple],
            event_stats=_event_stats[param_tuple],
            object_stats=_object_stats.get(param_tuple, None),
            meta=_event_stats[param_tuple].meta,  # type: ignore
            # df.meta might not be set when the DataFrame gets further processed after loading. For example, target_emissions gets converted to a Series and loses the attribute.
        )
        for param_tuple in _target_emissions
        if stat.rule is None or stat.rule == param_tuple[2]
    }
    df = pd.DataFrame(
        [(*ks, v) for ks, v in stats.items()],
        columns=[*params, "value"],
    )
    # df = df[df["value"].notna()].reset_index(drop=True)
    df = df.reset_index(drop=True)
    df["stat"] = stat.__name__
    # display(df)
    df["param_str"] = df.apply(lambda row: get_param_str(**row, mode="column"), axis=1)

    return df  # type: ignore


def get_param_str(
    rule: str,
    graph_mode: str | ag.GraphMode | None,
    remove_otype_loops: bool | None,
    mode: Literal["file", "column"] = "file",
    **kwargs,
):
    rule = RULE_ABBRS.get(rule, rule)
    if rule in {"AT", "PT"}:
        assert graph_mode is None and remove_otype_loops is None
        return rule

    assert graph_mode is not None
    assert remove_otype_loops is True or remove_otype_loops is False
    if isinstance(graph_mode, str):
        graph_mode = ag.GraphMode.from_string(graph_mode)

    if mode == "column":
        rule_str = "CTHU" if graph_mode == ag.GraphMode.HU_HU else "CT"
        otl_str = "x" if remove_otype_loops else ""
        return rule_str + otl_str
    elif mode == "file":
        return f"{rule}_{graph_mode:file}{'_x' if remove_otype_loops else ''}"
    raise ValueError


def analyze(
    df: pd.DataFrame,
    param_cols: list[str],
    col: str,
    target: str | list[str] = "time",
    add_dependent: bool | list[str] = True,
    abs: bool = True,
    rel: bool = True,
):
    """Analyzes a DataFrame, comparing target values `target` w.r.t. a selected column `col`.
    The other parameters `param_cols` are grouped by, with their value combinations kept as different rows.
    """
    if isinstance(target, str):
        target_cols = [target]
    else:
        target_cols = target

    df = df.reset_index()
    col_values = df[col].unique()
    remaining_params = [c for c in param_cols if c != col]

    # Summarize other dependent / constant columns
    unique = df.nunique(dropna=False) == 1
    constants = {c: df[c].iloc[0] for c in unique[unique].index}

    if add_dependent:
        dependencies = {}
        for col1 in param_cols:
            if col1 == col:
                continue
            unique = (df.groupby(col1).nunique(dropna=False) == 1).all()
            deps = list(set(unique[unique].index).difference(constants.keys(), param_cols))
            if deps:
                dependencies[col1] = sorted(deps, key=df.columns.tolist().index)
        print(f"Constant: " + ", ".join([f"{k}={v}" for k, v in constants.items()]))
        print(
            f"Dependencies: "
            + ", ".join([f"{c} -> [{', '.join(deps)}]" for c, deps in dependencies.items()])
        )
        remaining_params_dependencies = list(
            set(sum([dependencies.get(c, []) for c in remaining_params], []))
        )
    else:
        remaining_params_dependencies = []

    def analyze_group(group, target_col):
        group_values = {
            x: group[(group[col] == x) if not pd.isna(x) else group[col].isna()][target_col]
            .reset_index(drop=True)
            .to_dict()
            .get(0, np.nan)
            for x in col_values
        }
        d = {x: t for x, t in group_values.items()}
        d.update({"min": min(group_values, key=group_values.get)})  # type: ignore
        d.update({"max": max(group_values, key=group_values.get)})  # type: ignore
        if len(col_values) == 2:
            (x1, t1), (x2, t2) = group_values.items()
            if rel:
                d.update({f"{x1} / {x2}": t1 / t2})
                d.update({f"{x2} / {x1}": t2 / t1})
            if abs:
                d.update({f"{x1} - {x2}": t1 - t2})
                d.update({f"{x2} - {x1}": t2 - t1})
        return pd.Series(d)

    groups = df.groupby(remaining_params + remaining_params_dependencies, dropna=False)
    _results = {
        target_col: groups.apply(
            lambda g: analyze_group(g, target_col=target_col),
            include_groups=False,
        )
        for target_col in target_cols
    }
    if len(target_cols) == 1:
        return _results[target_cols[0]].rename_axis(target, axis=1)
    return pd.concat(
        [
            res.pipe(pd_util.prepend_level, target_col, axis=1)
            for target_col, res in _results.items()
        ],
        axis=1,
    )
