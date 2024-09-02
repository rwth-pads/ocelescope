import json

from IPython.display import Javascript, display

# from data.evaluation.src.jupyter_utils.logger import logger
from api.logger import logger


def set_clipboard(content: str, log: bool = True):
    """JavaScript code to set clipboard content"""
    js_code = f"navigator.clipboard.writeText({json.dumps(content)});"
    display(Javascript(js_code))
    if log:
        logger.info(f"Clipboard content set successfully.")
