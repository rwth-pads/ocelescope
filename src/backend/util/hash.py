import hashlib
import json
from pydantic import BaseModel


def filters_hash(filters: list[BaseModel]) -> str:
    """Returns a unique and stable hash for a list of filters"""
    filters_dict = [f.model_dump() for f in filters]
    filters_json = json.dumps(filters_dict, sort_keys=True)
    return hashlib.sha256(filters_json.encode("utf-8")).hexdigest()
