import { combineClassNames } from "@/src/util";
import React, { ReactNode } from "react";
import { Col, ColProps, Row, RowProps } from "react-bootstrap";

export type ChunkedColumnsProps = {
  numCols?: number;
  minNumCols?: number;
  maxNumCols?: number;
  colLength?: number;
  minColLength?: number;
  maxColLength?: number;
  gap?: number;
  flow?: "row" | "column";
  breakpoint?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  colProps?: ColProps;
} & React.HTMLProps<HTMLDivElement> &
  RowProps;

/**
 * Component used to split a list of elements into multiple columns
 */
const ChunkedColumns: React.FC<ChunkedColumnsProps> = ({
  children,
  numCols,
  minNumCols,
  maxNumCols = 6,
  colLength,
  minColLength,
  maxColLength,
  gap,
  flow = "column",
  breakpoint = "sm",
  colProps = {},
  className,
  ...props
}) => {
  const childrenArray = React.Children.toArray(children);

  if (!numCols) {
    numCols = determineOptimalNumCols(childrenArray.length, {
      minNumCols,
      maxNumCols,
      colLength,
      minColLength,
      maxColLength,
    });
  }

  if (numCols > 12)
    throw Error(
      "column splitting not possible - maximum 12 columns supported with bootstrap",
    );
  const colWidth = Math.floor(12 / numCols);
  const lastColWidth = 12 - colWidth * (numCols - 1);

  // Chunk the children into columns
  const chunkedChildren = chunkChildren(childrenArray, numCols, flow);

  return (
    <Row
      className={combineClassNames(
        "d-flex",
        gap ? `gap-${gap}` : undefined,
        className,
      )}
      {...props}
    >
      {chunkedChildren.map((chunk, i) => (
        <Col
          key={i}
          {...{ [breakpoint]: i < numCols - 1 ? colWidth : lastColWidth }}
          {...colProps}
        >
          {chunk}
        </Col>
      ))}
    </Row>
  );
};

function determineOptimalNumCols(
  numElements: number,
  {
    minNumCols = 1,
    maxNumCols,
    colLength,
    minColLength = 1,
    maxColLength,
  }: Partial<ChunkedColumnsProps>,
): number {
  // Sanity checks
  if (maxNumCols && maxColLength && numElements > maxNumCols * maxColLength)
    throw Error("column splitting not possible - too many elements");
  if (numElements < minNumCols * minColLength)
    throw Error("column splitting not possible - too few elements");

  // Determine initial number of columns based on `colLength`, if provided
  let numCols = colLength ? Math.ceil(numElements / colLength) : 1;

  // Ensure numCols is within the provided `minNumCols` and `maxNumCols` constraints
  if (minNumCols !== undefined) numCols = Math.max(numCols, minNumCols);
  if (maxNumCols !== undefined) numCols = Math.min(numCols, maxNumCols);

  // Adjust number of columns based on `minColLength` and `maxColLength`
  if (minColLength !== undefined) {
    // Check if the current number of columns results in a column length less than `minColLength`
    while (Math.ceil(numElements / numCols) < minColLength && numCols > 1) {
      numCols--;
    }
  }

  if (maxColLength !== undefined) {
    // Check if the current number of columns results in a column length more than `maxColLength`
    while (Math.ceil(numElements / numCols) > maxColLength) {
      numCols++;
    }
  }

  // Reapply column constraints after adjustments
  if (minNumCols !== undefined) numCols = Math.max(numCols, minNumCols);
  if (maxNumCols !== undefined) numCols = Math.min(numCols, maxNumCols);

  return numCols;
}

function chunkChildren(
  childrenArray: ReactNode[],
  numCols: number,
  flow: ChunkedColumnsProps["flow"],
): ReactNode[][] {
  const chunks = [];
  const chunkSize = Math.ceil(childrenArray.length / numCols);

  if (flow == "column") {
    for (let i = 0; i < childrenArray.length; i += chunkSize) {
      chunks.push(childrenArray.slice(i, i + chunkSize));
    }
  } else if (flow == "row") {
    for (let i = 0; i < numCols; i++) {
      chunks.push([]);
    }
    for (let j = 0; j < childrenArray.length; j++) {
      const chunk: any[] = chunks[j % numCols];
      chunk.push(childrenArray[j]);
    }
  }

  return chunks;
}

export default ChunkedColumns;
