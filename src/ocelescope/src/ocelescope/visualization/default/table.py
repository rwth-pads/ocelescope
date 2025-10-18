from typing import Any, List, Literal, Optional

from pydantic import BaseModel

from ocelescope.visualization.visualization import Visualization

TableDataType = Literal["string", "number", "boolean", "date", "datetime"]


class TableColumn(BaseModel):
    """Represents a column definition within a table visualization.

    Defines the metadata and rendering behavior of a single table column,
    including label, type, and visibility options.

    Attributes:
        id (str): Unique identifier for the column.
        label (Optional[str]): Human-readable label shown in the table header.
        data_type (TableDataType): The data type of values in this column.
        sortable (bool): Whether the column supports sorting. Defaults to True.
        visible (bool): Whether the column is visible by default. Defaults to True.
    """

    id: str
    label: Optional[str] = None
    data_type: TableDataType = "string"
    sortable: bool = True
    visible: bool = True


class Table(Visualization):
    """Tabular visualization resource.

    Represents a data table visualization, containing column definitions
    and rows of structured data. Each row is a dictionary mapping column
    IDs to their corresponding values.

    Attributes:
        type (Literal["table"]): Visualization type identifier ("table").
        columns (List[TableColumn]): List of column definitions.
        rows (List[dict[str, Any]]): List of data rows, each represented as a dictionary
            mapping column IDs to cell values.
    """

    type: Literal["table"] = "table"
    columns: List[TableColumn]
    rows: List[dict[str, Any]]
