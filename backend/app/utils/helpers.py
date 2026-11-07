from bson import ObjectId
from datetime import datetime, date
from typing import Any

def serialize_doc(doc: dict | None) -> dict | None:
    if doc is None:
        return None
    res = {}
    for k, v in doc.items():
        if k == "_id":
            res["id"] = str(v)
        elif isinstance(v, ObjectId):
            res[k] = str(v)
        elif isinstance(v, (datetime, date)):
            res[k] = v.isoformat()
        elif isinstance(v, list):
            res[k] = [serialize_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in v]
        elif isinstance(v, dict):
            res[k] = serialize_doc(v)
        else:
            res[k] = v
    return res

def serialize_list(docs: list[dict]) -> list[dict]:
    return [serialize_doc(doc) for doc in docs]
