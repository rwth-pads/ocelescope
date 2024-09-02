from visualization.rwth_colors import *

HU_COLOR = RWTH_ORANGE
# THU_COLOR = RWTH_RED
RESOURCE_COLOR = RWTH_TURQUOISE

OCEL_ABBRS = {
    "orderManagementWithDistances": "OrdMgmt.",
    "containerLogistics": "CtrLog.",
    "p2p": "P2P",
    "hinge": "Hinge",
}
OCEL_COLORS = {
    "orderManagementWithDistances": RWTH_TEAL,
    "containerLogistics": RWTH_MAYGREEN,
    "p2p": RWTH_PURPLE,
    "hinge": "black",
}

GM_COLORS = {"HU-HU": HU_COLOR, "Obj-Obj": RESOURCE_COLOR}
GM_MARKERS = {
    "HU-HU": dict(
        marker=">",
    ),
    "Obj-Obj": dict(
        marker="o",
    ),
}
GM_LABELS = {"HU-HU": "CTHU", "Obj-Obj": "CT"}

GRID_ARGS = dict(
    color="gray",
    alpha=0.5,
    linewidth=0.4,
)
