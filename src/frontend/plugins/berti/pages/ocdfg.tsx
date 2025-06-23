import { useOcdfg, useSaveOcdfg } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import { useMemo, useState } from "react";
import ObjectTypeFilterInput from "@/components/OcelInputs/ObjectTypeFilter";
import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import { Divider, LoadingOverlay, ScrollArea, Stack } from "@mantine/core";
import CytoscapeSidebar from "@/components/Cytoscape/components/SideBar";
import EventTypeFilterInput from "@/components/OcelInputs/ActivityTypeFilter";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";

import Ocdfg from "@/components/Resource/Ocdfg";
import useWaitForTask from "@/hooks/useTaskWaiter";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import FloatingAnotation from "@/components/Cytoscape/components/FloatingLabel";
import { EventObjectNode } from "cytoscape";
import { showNotification } from "@mantine/notifications";
import { Save } from "lucide-react";

const OCDFGPage = () => {
  const invalidateResources = useInvalidateResources();
  const { mutate } = useSaveOcdfg({
    mutation: {
      onSuccess: async (addedResource) => {
        showNotification({
          title: "Resource Saved",
          message: addedResource.name,
        });
        await invalidateResources();
      },
    },
  });
  const { data: ocdfgResponse, refetch } = useOcdfg({});
  const [isOptionsOpen, setOptionsOpen] = useState(true);

  const [disabledObjectTypes, setDisabledObjectTypes] = useState<string[]>([]);
  const { data: objectCount = {} } = useObjectCount();
  const [disabledEventTypes, setDisabledEventTypes] = useState<string[]>([]);
  const { data: eventCount = {} } = useEventCounts();

  const enabledObjectTypes = useMemo(() => {
    return Object.keys(objectCount ?? {}).filter(
      (objectName) => !disabledObjectTypes.includes(objectName),
    );
  }, [disabledObjectTypes, objectCount]);

  const enabledEventTypes = useMemo(() => {
    return Object.keys(eventCount ?? {}).filter(
      (eventName) => !disabledEventTypes.includes(eventName),
    );
  }, [disabledEventTypes, eventCount]);

  useWaitForTask({
    taskId: ocdfgResponse?.taskId ?? undefined,
    onSuccess: refetch,
  });

  const toggleOptions = () => setOptionsOpen((prevIsOpen) => !prevIsOpen);

  return (
    <Ocdfg ocdfg={ocdfgResponse?.result ?? undefined}>
      {isOptionsOpen && (
        <CytoscapeSidebar close={() => setOptionsOpen((prev) => !prev)}>
          <ScrollArea h={"100%"}>
            <Stack></Stack>
          </ScrollArea>
        </CytoscapeSidebar>
      )}
      <ActionButtons
        toggleOptions={toggleOptions}
        onSave={ocdfgResponse?.result ? () => mutate({}) : undefined}
      />
      <LoadingOverlay zIndex={1} visible={!ocdfgResponse?.result} />
      <FloatingAnotation
        trigger={{ action: "hover", target: "node" }}
        content={(e) => {
          const name = e.target._private.data.label;
          return <>Hoverd over {name}</>;
        }}
      />
      <FloatingAnotation
        trigger={{ action: "rightClick", target: "edge" }}
        content={(e) => {
          console.log(e.target._private);
          const name = e.target._private.data.id;
          return <>Clicked on {name}</>;
        }}
      />
      <FloatingAnotation
        trigger={{ action: "leftClick", target: "edge" }}
        content={(e) => {
          const name = e.target._private.data.id;
          return <>Right click on {name}</>;
        }}
      />
    </Ocdfg>
  );
};

export default OCDFGPage;
export const config: RouteDefinition = { name: "Object-Centric DFG" };
