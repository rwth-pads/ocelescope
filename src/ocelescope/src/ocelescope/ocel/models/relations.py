from dataclasses import dataclass


@dataclass
class RelationCountSummary:
    qualifier: str
    source: str
    target: str
    min_count: int
    max_count: int
    sum: int
