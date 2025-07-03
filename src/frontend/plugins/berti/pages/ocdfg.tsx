import { RouteDefinition } from "@/plugins/types";
import { LoadingOverlay } from "@mantine/core";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";

import Ocdfg from "@/components/Resource/Ocdfg";
import useWaitForTask from "@/hooks/useTaskWaiter";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import { showNotification } from "@mantine/notifications";
import { useBertiOcdfg, useBertiSaveOcdfg } from "@/api/fastapi/berti/berti";

const OCDFGPage = () => {
  const invalidateResources = useInvalidateResources();
  const { mutate } = useBertiSaveOcdfg({
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

  const { data: ocdfgResponse, refetch } = useBertiOcdfg({});

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
