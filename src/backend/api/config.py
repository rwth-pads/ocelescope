from pydantic import DirectoryPath, Field, FilePath, SecretStr
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

    OPENAPI_SCHEMA_PATH: FilePath = Field(
        default="openapi.json",
        description="The OpenAPI schema file gets saved at this path.",
        validate_default=True,
    )

    SESSION_ID_HEADER: str = Field(
        default="Ocean-Session-Id",
        description="The HTTP header name containing the session ID.",
    )

    EXPOSE_ERROR_DETAILS: bool = Field(
        default=False,
        description="When set to True, passes details of internal errors via the API. Always set to False in production environment.",
    )

    CACHED_TASK_TIMEOUT: float = Field(
        default=0.5,
        description="Number of seconds to wait for a supposedly cached task to be finished to then return a non-task object",
    )

    DATA_DIR: DirectoryPath = Field(
        default="./data",
        description="Path to the data directory, relative to `main.py`",
    )

    CURRENCY_EXCHANGE_DATE: str = Field(
        default="20241005",
        description="Reference date for currency exchange rates, determines what pint context to use.\nThe rates can be updated, and a new context generated, using the notebook at `data/units/currency_exchange_rates.ipynb`.",
        pattern=r"^\d{8}$",
    )

    CLIMATIQ_API_KEY: SecretStr = Field(
        description="Climatiq API key. TODO pass the key set by the user via the API and remove this field.",
        default="",
    )

    class Config:
        env_file = ".env"


config = OceanConfig()  # type: ignore
