import { useOcdfg, useSaveOcdfg } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import { useState } from "react";
import { LoadingOverlay, ScrollArea, Stack } from "@mantine/core";
import CytoscapeSidebar from "@/components/Cytoscape/components/SideBar";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";

import Ocdfg from "@/components/Resource/Ocdfg";
import useWaitForTask from "@/hooks/useTaskWaiter";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import FloatingAnotation from "@/components/Cytoscape/components/FloatingLabel";
import { showNotification } from "@mantine/notifications";

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
