from dataclasses import dataclass
from typing import Literal

from resources.base import AnnotatedClass, Resource

Temporal_Relation_Constant = Literal["D", "Di", "I", "Ii", "P"]

Cardinality = Literal["0", "1", "0...1", "1..*", "0...*"]


@dataclass
class TotemEdge(AnnotatedClass):
    source: str
    target: str
    lc: Cardinality
    lc_inverse: Cardinality
    ec: Cardinality
    ec_inverse: Cardinality
    tr: Temporal_Relation_Constant
    tr_inverse: Temporal_Relation_Constant


@dataclass
class Totem(Resource):
    object_types: list[str]
    edges: list[TotemEdge]
    type: Literal["totem"] = "totem"
