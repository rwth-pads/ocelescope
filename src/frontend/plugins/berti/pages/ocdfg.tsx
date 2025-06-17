import { useOcdfg } from "@/api/fastapi/berti/berti";
import { useTaskModal } from "@/components/TaskModal/TaskModal";
import { RouteDefinition } from "@/plugins/types";
import { useEffect, useMemo, useState } from "react";
import OCDFG from "../components/OCDFG";
import ObjectTypeFilterInput from "@/components/OcelInputs/ObjectTypeFilter";
import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import { Divider, ScrollArea, Stack } from "@mantine/core";
import CytoscapeSidebar from "@/components/Cytoscape/components/SideBar";
import { Ocdfg } from "@/api/fastapi-schemas";
import EventTypeFilterInput from "@/components/OcelInputs/ActivityTypeFilter";

const OCDFGPage = () => {
  const { showTaskModal } = useTaskModal();
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

  const ocdfg: Ocdfg | undefined = useMemo(() => {
    const result = ocdfgResponse?.result;
    if (!result) {
      return undefined;
    }
    const edges = result.edges.filter(
      ({ object_type, source, target }) =>
        !disabledObjectTypes.includes(object_type) &&
        !disabledEventTypes.includes(source) &&
        !disabledEventTypes.includes(target),
    );

    const end_activities = Object.fromEntries(
      Object.entries(result.end_activities)
        .filter(
          ([objectType, _start_activities]) =>
            !disabledObjectTypes.includes(objectType),
        )
        .map(([objectType, endActivities]) => [
          objectType,
          endActivities.filter(
            (activity) => !disabledEventTypes.includes(activity),
          ),
        ]),
    );
    const start_activities = Object.fromEntries(
      Object.entries(result.start_activities)
        .filter(
          ([objectType, _end_activities]) =>
            !disabledObjectTypes.includes(objectType),
        )
        .map(([objectType, startActivities]) => [
          objectType,
          startActivities.filter(
            (activity) => !disabledEventTypes.includes(activity),
          ),
        ]),
    );

    const activities = result.activities.filter(
      (activity) =>
        !disabledEventTypes.includes(activity) &&
        (edges.some(
          ({ source, target }) => source === activity || target === activity,
        ) ||
          Object.values(end_activities).some((endActivities) =>
            endActivities.includes(activity),
          ) ||
          Object.values(end_activities).some((endActivities) =>
            endActivities.includes(activity),
          )),
    );

    return {
      object_types: result.object_types.filter(
        (objectType) => !disabledObjectTypes.includes(objectType),
      ),
      edges,
      activities,
      end_activities,
      start_activities,
    } satisfies Ocdfg;
  }, [ocdfgResponse?.result, disabledEventTypes, disabledObjectTypes]);

  useEffect(() => {
    if (ocdfgResponse?.taskId && ocdfgResponse.status !== "SUCCESS") {
      showTaskModal({
        taskId: ocdfgResponse.taskId,
        onSuccess: () => {
          refetch();
        },
      });
    }
  }, [ocdfgResponse?.taskId]);

  return (
    <OCDFG ocdfg={ocdfg} toggleOptions={() => setOptionsOpen((prev) => !prev)}>
      {isOptionsOpen && (
        <CytoscapeSidebar close={() => setOptionsOpen((prev) => !prev)}>
          <ScrollArea h={"100%"}>
            <Stack>
              <ObjectTypeFilterInput
                value={enabledObjectTypes}
                onChange={(newEnabledObjects) => {
                  setDisabledObjectTypes(
                    Object.keys(objectCount).filter(
                      (objectName) => !newEnabledObjects.includes(objectName),
                    ),
                  );
                }}
              />
              <Divider />
              <EventTypeFilterInput
                value={enabledEventTypes}
                onChange={(newEnabledEvents) => {
                  setDisabledEventTypes(
                    Object.keys(eventCount).filter(
                      (eventName) => !newEnabledEvents.includes(eventName),
                    ),
                  );
                }}
              />
            </Stack>
          </ScrollArea>
        </CytoscapeSidebar>
      )}
    </OCDFG>
  );
};

export default OCDFGPage;
export const config: RouteDefinition = { name: "Object-Centric DFG" };
