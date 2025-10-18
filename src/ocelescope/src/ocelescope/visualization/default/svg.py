from typing import Literal

from ocelescope.visualization.visualization import Visualization


class SVGVis(Visualization):
    """Visualization resource containing an SVG representation.

    Represents a pre-rendered static visualization stored as an SVG string.
    This class wraps raw SVG output for display or embedding within the
    OCEL visualization framework.

    Attributes:
        type (Literal["svg"]): Visualization type identifier ("svg").
        svg (str): The SVG markup string representing the rendered visualization.
    """

    type: Literal["svg"] = "svg"
    svg: str
