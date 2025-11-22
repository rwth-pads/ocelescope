from __future__ import annotations

import warnings
from pathlib import Path
from typing import Any

import pm4py
from pm4py.objects.ocel.obj import OCEL as PM4PYOCEL

from ocelescope.ocel.extensions.manager import ExtensionManager
from ocelescope.ocel.filter.base import BaseFilter
from ocelescope.ocel.managers.objects import ObjectsManager
from ocelescope.ocel.models.meta import OCELMeta


class OCEL:
    def __init__(self, ocel: PM4PYOCEL, meta: OCELMeta | None = None):
        self.ocel = ocel
        self.meta = meta or OCELMeta()
        self.extensions = ExtensionManager(self)
        self.objects = ObjectsManager(self)

    @property
    def events(self):
        return self.ocel.events

    @property
    def e2o(self):
        return self.ocel.relations

    @property
    def o2o(self):
        return self.ocel.o2o

    def filter(self, pipeline: list[BaseFilter]) -> OCEL:
        """
        Apply a sequence of filters to this OCEL instance.

        Each filter in the pipeline is executed in order, and their results are
        combined to produce a filtered view of the underlying OCEL. A new OCEL
        instance is returned containing only the events and objects that satisfy
        all filters.

        Args:
            pipeline: A list of filter objects derived from ``BaseFilter``.
                Each filter defines its own selection criteria for events and/or
                objects.

        Returns:
            OCEL: A new OCEL instance containing only the filtered subset of
            events and objects.
        """
        from ocelescope.ocel.filter.engine import apply_filters

        return apply_filters(ocel=self, filters=pipeline)

    @staticmethod
    def read(path: str | Path, meta: dict[str, Any] = {}) -> OCEL:
        """
        Read an OCEL2 (.jsonocel / .xmlocel / .sqlite) file
        and return an OCEL wrapper.
        """
        path = Path(path)

        with warnings.catch_warnings(record=True):
            match path.suffix:
                case ".sqlite":
                    pm4py_ocel = pm4py.read.read_ocel2_sqlite(str(path))
                case ".xmlocel":
                    pm4py_ocel = pm4py.read.read_ocel2_xml(str(path))
                case ".jsonocel":
                    pm4py_ocel = pm4py.read.read_ocel2_json(str(path))
                case _:
                    raise ValueError(f"Unsupported extension: {path.suffix}")

        return OCEL(ocel=pm4py_ocel, meta=OCELMeta(path=path, extra=meta))

    def write(self, path: str | Path):
        """
        Write the OCEL to disk based on file extension.
        """
        path = Path(path)

        match path.suffix:
            case ".xmlocel":
                pm4py.write_ocel2_xml(self.ocel, str(path))
            case ".jsonocel":
                pm4py.write_ocel2_json(self.ocel, str(path))
            case ".sqlite":
                pm4py.write_ocel2_sqlite(self.ocel, str(path))
            case _:
                raise ValueError(f"Unsupported extension: {path.suffix}")

        self.extensions.export_all(path)

    @property
    def id(self) -> str:
        return self.meta.id

    def __str__(self):
        return f"OCEL [{len(self.events)} events, {len(self.objects.df)} objects]"

    def __repr__(self):
        return str(self)
