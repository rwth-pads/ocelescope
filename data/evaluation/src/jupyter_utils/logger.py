import logging

from api.logger import logger

logging.basicConfig(handlers=[logging.StreamHandler()])
logger.setLevel(logging.INFO)

import logging

from IPython.display import HTML, display

JUPYTER_LAB_STYLES = {
    level: {
        "color": f"var(--md-{color}-900)",
        "background": f"var(--md-{color}-50)",
        "border-left": f".5rem solid var(--md-{color}-600)",
    }
    for level, color in {
        logging.DEBUG: "grey",
        logging.INFO: "cyan",
        logging.WARNING: "orange",
        logging.ERROR: "red",
        logging.CRITICAL: "red",
    }.items()
}

VSCODE_STYLES = {
    level: {
        "color": f"var(--theme-{name}-foreground)",
        "background": f"var(--theme-{name}-background)",
        "border-left": f"var(--theme-{name}-foreground)",
    }
    for level, name in {
        logging.DEBUG: "info",
        logging.INFO: "info",
        logging.WARNING: "warning",
        logging.ERROR: "error",
        logging.CRITICAL: "error",
    }.items()
}


class JupyterLoggerHandler(logging.Handler):
    def emit(self, record):
        # Map log level to color
        level_styles = VSCODE_STYLES
        message = self.format(record)
        style = {
            # "color": f"var(--jp-{color}-color0)",
            # "background": f"var(--jp-{color}-color3)",
            # "border-left": f".5rem solid var(--jp-{color}-color1)",
            **level_styles[record.levelno],
            "padding-left": ".5rem",
            "margin-bottom": "0",
            # "color": f"var(--jp-{color}-color{i_fg})",
        }
        pre = True

        wrap_msg = lambda s: (
            f"<pre style='background: inherit; color: inherit;'>{s}</pre>" if pre else s
        )
        display(
            HTML(
                f"<div style='{';'.join([k+':'+v for k, v in style.items()])}'>{wrap_msg(message)}</div>"
            )
        )


# Remove existing handlers
for handler in logger.handlers:
    logger.removeHandler(handler)
logger.propagate = False

# Create and add the custom handler
handler = JupyterLoggerHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
