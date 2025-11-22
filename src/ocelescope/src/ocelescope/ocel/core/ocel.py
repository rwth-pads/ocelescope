from __future__ import annotations

import warnings
from pathlib import Path
from typing import Any
from uuid import uuid4

import pm4py
from pm4py.objects.ocel.obj import OCEL as PM4PYOCEL

from ocelescope.ocel.models.meta import OCELMeta


class OCEL:
    def __init__(self, ocel: PM4PYOCEL, meta: OCELMeta | None = None):
        self._id = id or str(uuid4())
        self.ocel = ocel
        self.meta = meta or OCELMeta()

    @property
    def events(self):
        return self.ocel.events

    @property
    def e2o(self):
        return self.ocel.relations

    @property
    def o2o(self):
        return self.ocel.o2o

    @property
    def object_changes(self):
        return self.ocel.object_changes

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

    @property
    def id(self) -> str:
        return self.meta.id

    def __str__(self):
        return f"OCEL [{len(self.events)} events, {self.ocel.objects} objects]"

    def __repr__(self):
        return str(self)
