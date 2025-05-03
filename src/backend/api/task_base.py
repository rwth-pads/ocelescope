from __future__ import annotations

import warnings
from abc import ABC
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Callable, Iterable, Sized, overload

import numpy as np
import pandas as pd
from tqdm import tqdm

from api.logger import logger


class TaskState(str, Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    PROGRESS = "PROGRESS"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    RETRY = "RETRY"


"""
Progress updates should always be called using the static methods of the Task base class.
This way, depending on the environment, task can be None.
"""
NO_TASK_WARNING = False


@dataclass
class ProgressUpdate:
    percentage: float | None = None
    msg: str | None = None
    subtask: SubTask | None = None
    timestamp: datetime | None = None

    def __post_init__(self):
        self.timestamp = datetime.now()


class Task(ABC):
    def __init__(self, id: str, name: str):
        self.id = id
        self.name = name
        self.subtasks: list[SubTask] = []
        self.updates: list[ProgressUpdate] = []

    def update(
        self,
        percentage: float | None = None,
        msg: str | None = None,
        subtask: SubTask | None = None,
    ):
        self.updates.append(ProgressUpdate(percentage=percentage, msg=msg, subtask=subtask))

    def reset(self):
        summary = self.summary()
        self.updates = []
        return summary

    def summary(self):
        df = pd.DataFrame(
            [
                (
                    u.timestamp,
                    u.percentage,
                    *((u.subtask.id, u.subtask.name) if u.subtask else (None, None)),
                    u.msg,
                )
                for u in self.updates
            ],
            columns=["timestamp", "percentage", "subtask_id", "subtask_name", "msg"],
        )
        if len(df):
            if pd.isna(df.loc[0, "percentage"]):
                df.loc[0, "percentage"] = 0
        df["percentage"] = df["percentage"].ffill()
        return df

    def subtask_durations(self, groupby_msg: bool = False):
        key = ["subtask_id", "subtask_name", *(["msg"] if groupby_msg else [])]
        summary = self.summary()
        if not len(summary):
            return pd.DataFrame([], columns=["subtask_id", "subtask_name", "seconds", "percentage"])
        summary["seconds"] = (
            (summary["timestamp"].shift(-1) - summary["timestamp"]).dt.total_seconds().fillna(0)
        )
        subtask_durations = summary.groupby(key).agg({"seconds": "sum"}).reset_index()
        subtask_durations["percentage"] = (
            subtask_durations["seconds"] / subtask_durations["seconds"].sum()
            if subtask_durations["seconds"].sum() > 0
            else np.nan
        )
        return subtask_durations

    def _progress(
        self,
        msg: str | None = None,
        p: float | None = None,
        subtask: SubTask | None = None,
    ) -> None: ...

    def _iter_progress(
        self,
        it: Iterable,
        msg: str | None = None,
        step: int | None = None,
        start: float = 0,
        end: float = 1,
        total: int | None = None,
        subtask: SubTask | None = None,
    ) -> Iterable: ...

    def __str__(self):
        return f'{type(self).__name__}(id="{self.id}", name="{self.name}")'

    def __repr__(self):
        return str(self)

    @staticmethod
    def prog(task: Task | None, msg: str | None = None, p: float | None = None):
        """Sends a progress update to a task.
        Arguments:
            task -- the Task object. If None, do nothing.
            msg -- A string message to pass to the task (optional)
            p -- The progress value between 0 and 1 (optional)
        """
        if task is not None:
            task._progress(msg=msg, p=p)
        elif NO_TASK_WARNING:
            logger.warning(f"Task.prog(p={p}, msg={msg}) called on task = None")

    @staticmethod
    def iter(
        task: Task | None,
        it: Iterable,
        msg: str | None = None,
        step: int | None = None,
        start: float = 0,
        end: float = 1,
        total: int | None = None,
    ):
        """Modifies an Iterator in a way that the task receives progress updates during the iteration.
        Arguments:
            task -- the Task object. If None, do nothing.
            it -- the Iterable. Its values remain unchanged.
            msg -- A string message to pass to the task (optional)
            step -- Only send updates every <step> iterations (optional)
            start -- Lower progress bound (between 0 and 1, default 0)
            end -- Upper progress bound (between 0 and 1, default 1)
            total -- Prediction of the iterator length, should be passed if len(it) is not defined (optional)
        """
        if task is not None:
            return task._iter_progress(it=it, msg=msg, step=step, start=start, end=end, total=total)
        elif NO_TASK_WARNING:
            logger.warning(f"Task.iter(..., msg={msg}) called on task = None")
        return []


class TqdmTask(Task):
    next_id = 0

    def __init__(self, name: str, **tqdm_kwargs):
        id = f"TqdmTask#{TqdmTask.next_id}"
        TqdmTask.next_id += 1
        super().__init__(id=id, name=name)
        self.tqdm_kwargs = tqdm_kwargs

    def _progress(
        self,
        msg: str | None = None,
        p: float | None = None,
        subtask: SubTask | None = None,
    ):
        send_progress(self, msg=msg, p=p, subtask=subtask)

    def _iter_progress(
        self,
        it: Iterable,
        msg: str | None = None,
        step: int | None = None,
        start: float = 0,
        end: float = 1,
        total: int | None = None,
        subtask: SubTask | None = None,
    ):
        if msg is not None or start > 0 or end < 1:
            s_start_end = f"{start:.0%} - {end:.0%}"
            logger.debug(f"{msg} ({s_start_end})" if msg else s_start_end)
        if isinstance(it, Sized):
            total = len(it)

        self.update(percentage=start, msg=msg, subtask=subtask)
        for x in tqdm(it, total=total, **self.tqdm_kwargs):
            yield x
        self.update(percentage=end, msg=msg, subtask=subtask)


class SubTask(Task):
    """Creates a new subtask.
    Arguments:
        parent -- The parent Task. Can be None, in which case the subtask has no reporting function.
        name -- The subtask name, acting like a variable name
        msg -- A message to be added to the base task state and passed via the API.
        start -- The initial progress value (0--1), relative to the parent task's progress. If omitted, set to the maximum end value of other subtasks, or zero if it is the first subtask.
        end -- The final progress value (0--1), relative to the parent task's progress. Set to 1 if both p and end are omitted.
        p -- The progress portion (max 1), relative to the parent task's progress. Sets end := start + p when end is omitted.
    """

    next_index = 0

    def __init__(
        self,
        parent: Task | None,
        name: str,
        start: float | None = None,
        end: float | None = None,
        p: float | None = None,
        msg: str | None = None,
    ):
        self.parent = parent
        self.index = None
        if parent:
            self.index = len(parent.subtasks)
            parent.subtasks.append(self)
        else:
            self.index = SubTask.next_index
            SubTask.next_index += 1
        parent_id = parent.id if parent else "<None>"
        id = f"{parent_id}[{self.index}]"

        if start is None:
            if parent is None:
                start = 0
            else:
                others = (
                    [t.end for t in parent.subtasks if t is not self] if parent.subtasks else []
                )
                start = max(others) if others else 0
        if end is None:
            if p is None:
                end = 1
            else:
                end = start + p

        if start < 0:
            raise ValueError(f"SubTask '{name}' initialized with start < 0")
        if end > 1:
            raise ValueError(f"SubTask '{name}' initialized with end > 1")

        super().__init__(id=id, name=name)
        self.start = start
        self.end = end
        self.msg = msg

    @staticmethod
    def run_cached(
        instance,  # The instance with LRUCache / instance_lru_cache
        func: Callable,
        p: float,
        name: str,
        task: Task | None,
        args: tuple = (),
        kwargs: dict = {},
    ):
        """
        Runs func inside a subtask. If the result is already cached, does not create a subtask.
        Only works with functions that use custom LRUCache (@instance_lru_cache(ignore_task=True)).
        """
        # TODO need to pass task=None here? Depending on how ignore_task is implemented
        if func.cache_has(instance, *args, **kwargs):  # type: ignore
            subtask_func = None
            subtask_rest = task
        else:
            subtask_func = SubTask(task, p=p, name=name) if task is not None else None
            subtask_rest = SubTask(task, end=1, name=task.name) if task is not None else None
        result = func(task=subtask_func, *args, **kwargs)
        return result, subtask_rest

    @overload
    def map_progress(self, p: float) -> float: ...
    @overload
    def map_progress(self, p: None) -> None: ...
    def map_progress(self, p: float | None):
        if p is None:
            return None
        return self.start + (self.end - self.start) * p

    def _progress(
        self,
        msg: str | None = None,
        p: float | None = None,
        subtask: SubTask | None = None,
    ):
        if not self.parent:
            return
        self.parent._progress(
            msg=msg if msg is not None else self.msg,
            p=self.map_progress(p),
            subtask=self if subtask is None else subtask,
        )

    def _iter_progress(
        self,
        it: Iterable,
        msg: str | None = None,
        step: int | None = None,
        start: float = 0,
        end: float = 1,
        total: int | None = None,
        subtask: SubTask | None = None,
    ):
        if not self.parent:
            return it
        return self.parent._iter_progress(
            it,
            msg=msg if msg is not None else self.msg,
            step=step,
            start=self.map_progress(start),
            end=self.map_progress(end),
            total=total,
            subtask=self if subtask is None else subtask,
        )


def send_progress(
    task: Task | None,
    msg: str | None = None,
    p: float | None = None,
    subtask: SubTask | None = None,
):
    s_p = f"{p:.1%}" if p is not None else None
    logger.debug(
        "progress: " + (f"{msg} ({s_p})" if msg and p is not None else (msg if msg else f"{s_p}"))
    )
    if task is None:
        return
    task.update(percentage=p, msg=msg, subtask=subtask)


def send_iter_progress(
    task: Task | None,
    it: Iterable,
    msg: str | None = None,
    step: int | None = None,
    start: float = 0,
    end: float = 1,
    total: int | None = None,
    subtask: SubTask | None = None,
) -> Iterable:
    s_start_end = f"{start:.1%} - {end:.1%}"
    logger.debug("iteration progress: " + (f"{msg} ({s_start_end})" if msg else s_start_end))

    if task is None:
        return it

    pmap = None
    if isinstance(it, Sized):
        total = len(it)
    if total is not None:
        pmap = lambda i: max(0, min(1, start + (end - start) * (i / total)))
    else:
        warnings.warn(
            "iter_progress received a non-sized iterable without a length estimate (total)."
        )

    def report(percentage: float):
        task.update(percentage=percentage, msg=msg, subtask=subtask)

    if pmap is not None:
        report(pmap(0))

    for i, x in enumerate(it):
        if i != 0 and pmap is not None and (step is None or i % step == 0):
            report(pmap(i))
        yield x

    if pmap is not None:
        report(pmap(1))
    s_end = f"{end:.1%}"
    logger.debug("iteration progress: " + (f"{msg} (end / {s_end})" if msg else f"end / {s_end}"))
