import { useSaveTotem, useTotem } from "@/api/fastapi/totem/totem";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";
import CytoscapeSidebar from "@/components/Cytoscape/components/SideBar";
import Totem from "@/components/Resource/Totem";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { RouteDefinition } from "@/plugins/types";
import { Box, LoadingOverlay, Table } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useCallback, useState } from "react";
import useTotemStore from "../store";
import TotemForm from "../components/TotemForm";
import FloatingAnotation from "@/components/Cytoscape/components/FloatingLabel";
import { TotemEdgeTr } from "@/api/fastapi-schemas";

const TemporalDirectionDict: Record<TotemEdgeTr, string> = {
  D: "Depends",
  Di: "",
  I: "Initiates",
  Ii: "",
  P: "Parallel",
};
const MinePage = () => {
  const tau = useTotemStore((state) => state.tau);
  const { data: result, refetch } = useTotem({ tau });

  const [isOptionsOpen, setOptionsOpen] = useState(false);

  const invalidateResources = useInvalidateResources();
  const { mutate } = useSaveTotem({
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
  const { isTaskRunning } = useWaitForTask({
    taskId: result?.taskId ?? undefined,
    onSuccess: refetch,
  });

  const totemEdge = useCallback(
    (source: string, target: string) => {
      const totem = result?.result;
      if (!totem) return undefined;
      return totem.edges.find(
        ({ source: totemSource, target: totemTarget }) =>
          source === totemSource && target === totemTarget,
      );
    },
    [result?.result],
  );

  const toggleOptions = () => setOptionsOpen((prevIsOpen) => !prevIsOpen);

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <LoadingOverlay zIndex={1} visible={isTaskRunning} />
      {isOptionsOpen && (
        <CytoscapeSidebar close={() => setOptionsOpen((prev) => !prev)}>
          <TotemForm />
        </CytoscapeSidebar>
      )}
      {result?.result && (
        <Totem totem={result.result}>
          <ActionButtons
            toggleOptions={toggleOptions}
            onSave={result?.result ? () => mutate({}) : undefined}
          />
          <FloatingAnotation
            trigger={{ action: "rightClick", target: "edge" }}
            content={({ target }) => {
              const edge = totemEdge(
                target._private.data.source,
                target._private.data.target,
              );

              return (
                <Table withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th />
                      <Table.Th>{edge?.source}</Table.Th>
                      <Table.Th>{edge?.target}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Th>EC</Table.Th>
                      <Table.Th>{edge?.ec}</Table.Th>
                      <Table.Th>{edge?.ec_inverse}</Table.Th>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>LC</Table.Th>
                      <Table.Th>{edge?.lc}</Table.Th>
                      <Table.Th>{edge?.lc_inverse}</Table.Th>
                    </Table.Tr>
                    <Table.Tr>
                      <Table.Th>Temporal Relation</Table.Th>
                      <Table.Th>
                        {edge?.tr ? TemporalDirectionDict[edge.tr] : ""}
                      </Table.Th>
                      <Table.Th>
                        {edge?.tr_inverse
                          ? TemporalDirectionDict[edge.tr_inverse]
                          : ""}
                      </Table.Th>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              );
            }}
          />
        </Totem>
      )}
    </Box>
  );
};
export default MinePage;

export const config: RouteDefinition = { name: "Mine" };
