from .session import session_router
from .ocels import ocels_router
from .resources import resources_router
from .tasks import tasks_router

routes = [session_router, ocels_router, resources_router, tasks_router]
__all__ = ["routes"]
