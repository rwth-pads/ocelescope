from typing import Literal


def ocel_property_reference(ocel_id: str, property_name: Literal["object_type"]):
    return {
        "ocel_property": {
            "id": ocel_id,
            "property_name": property_name,
        }
    }


def result_reference(result_id: str):
    return {
        "result": {
            "id": result_id,
        }
    }
