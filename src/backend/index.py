from __future__ import annotations

from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from api.config import config
from api.docs import init_custom_docs
from api.middleware import ocel_access_middleware
from api.utils import (
    custom_snake2camel,
    error_handler_server,
    verify_parameter_alias_consistency,
)
from ocel.default_ocel import (
    load_default_ocels,
)
from registrar import register_extensions, register_modules

from fastapi import FastAPI
from routes import routes
from version import __version__
from api.logger import LOGGER_CONFIG

"""
In this file, all API routes of the OCEAn application are defined.
"""

# Init default sessions
load_default_ocels()

# Initialize FastAPI
app = FastAPI(
    title="OCEAn",
    version=__version__,
    docs_url=None,  # disable swagger docs, use rapidoc instead (call to init_custom_docs below)
    redoc_url=None,
    debug=True,
)

origins = [config.FRONTEND_URL]  # Frontend origin

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # enable cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(ocel_access_middleware)

# Error handler for internal server errors
app.exception_handler(Exception)(error_handler_server)

register_modules(app)
register_extensions()

for route in routes:
    app.include_router(route)

init_custom_docs(app)


def post_init_tasks():
    """Non-blocking tasks to be executed after the API has been initialized"""

    # Verify parameter aliases are consistent
    verify_parameter_alias_consistency(app, custom_snake2camel)


post_init_tasks()

if __name__ == "__main__":
    uvicorn.run(
        "index:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_config=LOGGER_CONFIG,
    )
