from __future__ import annotations

from fastapi.middleware.cors import CORSMiddleware

from api.config import OceanConfig
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
from plugin_loader import register_extensions, register_plugins

from fastapi import FastAPI
from routes import routes
from util.misc import export_example_settings_as_dotenv
from version import __version__

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
origins = ["http://localhost:3000"]  # Frontend origin
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

register_plugins(app)
register_extensions()

for route in routes:
    app.include_router(route)

init_custom_docs(app)


def post_init_tasks():
    """Non-blocking tasks to be executed after the API has been initialized"""

    # Verify parameter aliases are consistent
    verify_parameter_alias_consistency(app, custom_snake2camel)

    # Generate .env.example file
    export_example_settings_as_dotenv(OceanConfig, ".env.example")


post_init_tasks()
