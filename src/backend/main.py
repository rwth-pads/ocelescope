import uvicorn
import uvicorn.config

from api.logger import LOGGER_CONFIG

UVICORN_RELOAD = True

if __name__ == "__main__":
    uvicorn.run(
        "index:app",
        host="0.0.0.0",
        port=8000,
        reload=UVICORN_RELOAD,
        log_config=LOGGER_CONFIG,
    )
