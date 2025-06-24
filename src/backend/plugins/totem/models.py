from pydantic import BaseModel


class TotemRelation(BaseModel):
    source: str
    target: str
    lc: str
    lc_inverse: str
    ec: str
    ec_inverse: str
    tr: str
    tr_inverse: str


class TotemResult(BaseModel):
    relations: list[TotemRelation]
