
import { Graphviz, IGraphvizProps } from "graphviz-react";
import React from "react";


const GraphvizContainer = React.memo<IGraphvizProps>(({ dot, ...props }) => {

  return (
    <Graphviz dot={dot} {...props} />
  )

}, ({ dot: prevDot, ...prevProps }, { dot: nextDot, ...nextProps }) => {
  if (prevDot != nextDot) {
    return false
  }
  if (JSON.stringify(prevProps) != JSON.stringify(nextProps)) {
    return false
  }
  return true
})

GraphvizContainer.displayName = "GraphvizContainer"

export default GraphvizContainer;
