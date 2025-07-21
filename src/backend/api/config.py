from typing import Optional
from pydantic import DirectoryPath, Field
from pydantic_settings import BaseSettings

"""
This file containes a Config class defining all environment parameters, including types, default values and descriptions.
.env.example (and the structure of .env) should be generated using the `export_settings_as_dotenv` util function.
"""


class OceanConfig(BaseSettings):
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="The frontend URL, relevant for CORS settings",
    )

    SESSION_ID_HEADER: str = Field(
        default="Ocean-Session-Id",
        description="The HTTP header name containing the session ID.",
    )

    EXPOSE_ERROR_DETAILS: bool = Field(
        default=False,
        description="When set to True, passes details of internal errors via the API. Always set to False in production environment.",
    )

    DATA_DIR: Optional[DirectoryPath] = Field(
        default=None,
        description="Path to the data directory, relative to `main.py`",
    )

    PLUGIN_DIR: Optional[DirectoryPath] = Field(
        default=None, description="Path to the directory, where plugins are stored"
    )

    class Config:
        env_file = ".env"


config = OceanConfig()  # type: ignore
