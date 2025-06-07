import { RouteDefinition } from "@/plugins/types";
import FloatingFlow from "@/plugins/ocelot/components/ObjectGraph/FloatingFlow";
import { useO2o } from "@/api/fastapi/info/info";
import { useMemo } from "react";
import { InputGraph } from "../components/ObjectGraph/graph";

const ObjectGraph = () => {
  const { data: o2o = [] } = useO2o();

  const graph: InputGraph = useMemo(
    () => ({
      edges: o2o.map(({ src, target }) => ({ from: src, to: target })),
      nodes: Array.from(
        new Set(
          o2o.flatMap(({ target, src }) => [
            { id: target, label: target },
            { id: src, label: src },
          ]),
        ),
      ),
    }),
    [o2o],
  );
  return <FloatingFlow graph={graph} />;
};

export default ObjectGraph;

export const config: RouteDefinition = { name: "Object Graph" };
