import {
  useE2o,
  useEventAttributes,
  useEventCounts,
} from "@/api/fastapi/info/info";
import { LoadingOverlay, SimpleGrid } from "@mantine/core";
import EntityCard from "../components/EntityCard";
import { RouteDefinition } from "@/plugins/types";
import { useMemo } from "react";
import { RelationCountSummary } from "@/api/fastapi-schemas";

const EventOverview = () => {
  const { data: eventsSummary = {} } = useEventAttributes();
  const { data: e2o } = useE2o();
  const { data: eventCounts, isLoading: isEventCountsLoading } =
    useEventCounts();

  const relationMap = useMemo(() => {
    if (!e2o) return {};

    return e2o.reduce<Record<string, RelationCountSummary[]>>(
      (relationMap, currentRelation) => {
        if (currentRelation.source in relationMap)
          relationMap[currentRelation.source].push(currentRelation);
        else relationMap[currentRelation.source] = [];
        return relationMap;
      },
      {},
    );
  }, [e2o]);

  console.log(relationMap);

  return (
    <>
      <LoadingOverlay visible={isEventCountsLoading} />
      {eventCounts && (
        <SimpleGrid cols={4}>
          {Object.entries(eventCounts).map(([name, count]) => (
            <EntityCard
              key={name}
              count={count}
              name={name}
              attributeSummaries={eventsSummary[name]}
              relationSummaries={relationMap[name]}
            />
          ))}
        </SimpleGrid>
      )}
    </>
  );
};

export default EventOverview;

export const config: RouteDefinition = { name: "Event Overview" };
