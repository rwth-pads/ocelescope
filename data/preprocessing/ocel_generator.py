import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

import pandas as pd
from pm4py.ocel import OCEL  # type: ignore

from ocel.ocel_wrapper import OCELWrapper


@dataclass
class Object:
    id: str
    otype: str
    attr: dict[str, Any] = field(default_factory=dict)


@dataclass
class Event:
    id: str
    activity: str
    timestamp: datetime
    attr: dict[str, Any] = field(default_factory=dict)


def random_minutes(min: float = 1, max: float = 60):
    assert min <= max
    seconds = round(60 * (random.random() * (max - min) + min))
    return timedelta(seconds=seconds)


@dataclass
class OcelGenerator:
    otypes: list[str]
    activities: list[str]
    oid_prefixes: dict[str, str] | None = None

    def __post_init__(self):
        self.objects: list[Object] = []
        self.events: list[Event] = []
        self.e2os: list[tuple[Event, str, Object]] = []
        self.o2os: list[tuple[Object, str, Object]] = []

    def next_eid(self, activity: str):
        i = len(self.events) + 1
        return f"e{i}"
        # i = len([o for o in self.events if o.activity == activity]) + 1
        # return f"{activity}_{i}"

    def next_oid(self, otype: str):
        i = len([o for o in self.objects if o.otype == otype]) + 1
        prefix = (self.oid_prefixes or {}).get(otype, otype + "_")
        return f"{prefix}{i}"

    def ev(
        self,
        activity: str,
        eid: str | None = None,
        *,
        timestamp: datetime | None = None,
        dt: timedelta | None = None,
        attr: dict[str, Any] | None = None,
        objs: list[Object] | None = None,
    ):
        if activity not in self.activities:
            self.activities.append(activity)
        if timestamp is None:
            if dt is None:
                dt = timedelta(minutes=1)
            if self.events:
                timestamp = max(e.timestamp for e in self.events) + dt
            else:
                timestamp = datetime(2024, 1, 1, 0, 0)
        e = Event(
            id=eid or self.next_eid(activity),
            activity=activity,
            timestamp=timestamp,
            attr=attr or {},
        )
        self.events.append(e)
        if objs:
            self.e2o(e, *objs)
        return e

    def obj(self, otype: str, oid: str | None = None, attr: dict[str, Any] | None = None):
        if otype not in self.otypes:
            self.otypes.append(otype)
        oid = oid or self.next_oid(otype)
        o = Object(id=oid, otype=otype, attr=attr or {})
        self.objects.append(o)
        return o

    def e2o(self, ev: Event, *objs: Object, qual: str | None = None):
        for obj in objs:
            if not qual:
                qual = f"{ev.activity}-{obj.otype}"
            self.e2os.append((ev, qual, obj))

    def o2o(self, obj1: Object, obj2: Object, qual: str | None = None):
        if not qual:
            qual = f"{obj1.otype}-{obj2.otype}"
        self.o2os.append((obj1, qual, obj2))

    def get_objs(self, otype: str):
        return [o for o in self.objects if o.otype == otype]

    def get_evs(self, activity: str):
        return [e for e in self.events if e.activity == activity]

    def generate(self):
        if not self.objects:
            raise ValueError("No objects")
        oattrs = set().union(*[o.attr.keys() for o in self.objects])
        objects = pd.DataFrame(
            [
                {
                    "ocel:oid": o.id,
                    "ocel:type": o.otype,
                    **{attr: o.attr.get(attr, None) for attr in oattrs},
                }
                for o in self.objects
            ]
        )

        if not self.events:
            raise ValueError("No events")
        eattrs = set().union(*[e.attr.keys() for e in self.events])
        events = pd.DataFrame(
            [
                {
                    "ocel:eid": e.id,
                    "ocel:activity": e.activity,
                    "ocel:timestamp": e.timestamp,
                    **{attr: e.attr.get(attr, None) for attr in eattrs},
                }
                for e in self.events
            ]
        )

        e2o = pd.DataFrame(
            [(e.id, e.activity, e.timestamp, o.id, o.otype, q) for e, q, o in self.e2os],
            columns=[
                "ocel:eid",
                "ocel:activity",
                "ocel:timestamp",
                "ocel:oid",
                "ocel:type",
                "ocel:qualifier",
            ],
        )

        o2o = pd.DataFrame(
            [(o1.id, q, o2.id) for o1, q, o2 in self.o2os],
            columns=["ocel:oid", "ocel:qualifier", "ocel:oid_2"],
        )

        object_changes = pd.DataFrame(
            {
                col: []
                for col in [
                    "ocel:oid",
                    "ocel:type",
                    "ocel:timestamp",
                    "ocel:field",
                    *oattrs,
                    "@@cumcount",
                ]
            }
        )

        pm4py_ocel = OCEL(
            objects=objects, events=events, relations=e2o, o2o=o2o, object_changes=object_changes
        )
        ocel = OCELWrapper(pm4py_ocel)
        return ocel
