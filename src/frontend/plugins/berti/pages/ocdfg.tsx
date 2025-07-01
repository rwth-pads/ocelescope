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

  useWaitForTask({
    taskId: ocdfgResponse?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Ocdfg ocdfg={ocdfgResponse?.result ?? undefined}>
      <ActionButtons
        onSave={ocdfgResponse?.result ? () => mutate({}) : undefined}
      />
      <LoadingOverlay zIndex={1} visible={!ocdfgResponse?.result} />
    </Ocdfg>
  );
};

export default OCDFGPage;
export const config: RouteDefinition = { name: "Object-Centric DFG" };
