import { Affix, Paper } from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { useCytoscapeContext } from "../CytoscapeContext";
import { useEffect, useState } from "react";

type TriggerType = {
  action: "hover" | "rightClick" | "leftClick";
  target?: "node" | "edge";
};

const FloatingAnotation: React.FC<{
  children: React.ReactNode;
  triggerType: TriggerType;
}> = ({ children }) => {
  const { cy } = useCytoscapeContext();

  const [position, setPositon] = useState<{ x: number; y: number } | undefined>(
    undefined,
  );
  const ref = useClickOutside(() => setPositon(undefined));

  useEffect(() => {
    if (!cy.current) return;
    const cytoscape = cy.current;
    cytoscape.addListener("tapdragover", "node", (event) =>
      setPositon({ x: event.originalEvent.x, y: event.originalEvent.y }),
    );
    cytoscape.addListener("tapdragout", "node", (event) => {
      setPositon(undefined);
    });
    return () => {
      cytoscape.removeListener("tapdragout", "node");
      cytoscape.removeListener("tapdragover", "node");
    };
  }, [cy]);

  if (!position) {
    return null;
  }

  return (
    <Affix ref={ref} position={{ top: position.y, left: position.x }}>
      <Paper w={200} h={200} shadow="xs" p="xl"></Paper>
    </Affix>
  );
};

export default FloatingAnotation;
