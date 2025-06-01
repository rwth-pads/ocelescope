# plugins/qel/plugin.py

from . import qel_extension  # Triggers registration

meta = {
    "prefix": "/qel",  # Optional, if you use routers
    "tags": ["QEL"],
}
