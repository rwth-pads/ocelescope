import { Affix, Paper } from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { useCytoscapeContext } from "../CytoscapeContext";
import { useEffect, useState } from "react";
import { EventObject } from "cytoscape";
import { EventObjectNode } from "cytoscape";

type TriggerType = {
  action: "hover" | "rightClick" | "leftClick" | "doubleClick";
  target?: "node" | "edge";
};

const triggerActionToStartEvent = {
  hover: "tapdragover",
  rightClick: "tap",
  leftClick: "cxttap",
  doubleClick: "dbltap",
};

const triggerActionToEndEvent = {
  hover: "tapdragout",
  rightClick: undefined,
  leftClick: undefined,
  doubleClick: undefined,
};

const FloatingAnotation: React.FC<{
  content: (event: EventObject) => React.ReactNode;
  trigger: TriggerType;
}> = ({ content, trigger }) => {
  const { cy } = useCytoscapeContext();

  const [position, setPositon] = useState<
    { x: number; y: number; event: EventObject } | undefined
  >(undefined);
  const ref = useClickOutside(() => setPositon(undefined));

  useEffect(() => {
    if (!cy.current) return;
    const cytoscape = cy.current;

    const triggerEndEvent = triggerActionToEndEvent[trigger.action];
    if (trigger.target) {
      cytoscape.addListener(
        triggerActionToStartEvent[trigger.action],
        trigger.target,
        (event) =>
          setPositon({
            x: event.originalEvent.x,
            y: event.originalEvent.y,
            event,
          }),
      );

      if (triggerEndEvent) {
        cytoscape.addListener(triggerEndEvent, trigger.target, (event) => {
          setPositon(undefined);
        });
      }
    } else {
      cytoscape.addListener(
        triggerActionToStartEvent[trigger.action],
        (event) =>
          setPositon({
            x: event.originalEvent.x,
            y: event.originalEvent.y,
            event,
          }),
      );

      if (triggerEndEvent) {
        cytoscape.addListener(triggerEndEvent, (event) => {
          setPositon(undefined);
        });
      }
    }

    return () => {
      if (trigger.target) {
        cytoscape.removeListener(
          triggerActionToStartEvent[trigger.action],
          trigger.target,
        );

        if (triggerEndEvent) {
          cytoscape.removeListener(triggerEndEvent, trigger.target);
        }
      }
      cytoscape.removeListener(triggerActionToStartEvent[trigger.action]);

      if (triggerEndEvent) {
        cytoscape.removeListener(triggerEndEvent);
      }
    };
  }, [cy, trigger]);

  if (!position) {
    return null;
  }

  return (
    <Affix ref={ref} position={{ top: position.y, left: position.x }}>
      <Paper shadow="xs" p="md">
        {content(position.event)}
      </Paper>
    </Affix>
  );
};

export default FloatingAnotation;
