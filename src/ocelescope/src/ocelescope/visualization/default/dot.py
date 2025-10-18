from typing import Literal

from graphviz import Digraph, Graph

from ocelescope.visualization.visualization import Visualization

GraphvizLayoutEngineName = Literal[
    "circo", "dot", "fdp", "sfdp", "neato", "osage", "patchwork", "twopi", "nop", "nop2"
]


class DotVis(Visualization):
    """Graphviz-based visualization resource.

    Represents a rendered Graphviz graph stored as a DOT string.
    This class wraps Graphviz diagrams for use in the OCEL visualization framework.

    Attributes:
        type (Literal["dot"]): Visualization type identifier ("dot").
        dot_str (str): The DOT source string defining the graph structure.
        layout_engine (GraphvizLayoutEngineName): The Graphviz layout algorithm to use.
    """

    type: Literal["dot"] = "dot"

    dot_str: str
    layout_engine: GraphvizLayoutEngineName = "dot"

    @classmethod
    def from_graphviz(
        cls, graph: Digraph | Graph, layout_engine: GraphvizLayoutEngineName = "dot"
    ) -> "DotVis":
        """Create a `DotVis` instance from a Graphviz `Digraph` or `Graph`.

        Extracts the DOT source code from a Graphviz object and wraps it into a
        `DotVis` visualization instance.

        Args:
            graph (Digraph | Graph): The Graphviz graph or digraph to wrap.
            layout_engine (GraphvizLayoutEngineName, optional):
                The layout engine used to render the graph. Defaults to "dot".

        Returns:
            DotVis: A new instance containing the graph's DOT source and layout configuration.
        """

        return DotVis(dot_str=graph.source, layout_engine=layout_engine)
