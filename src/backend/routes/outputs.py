from __future__ import annotations


from fastapi.routing import APIRouter


resources_router = APIRouter(prefix="/resources", tags=["resources"])
