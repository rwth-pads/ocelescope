import {
  useE2o,
  useEventAttributes,
  useEventCounts,
} from "@/api/fastapi/info/info";
import { Group, Input, LoadingOverlay, SimpleGrid, Stack } from "@mantine/core";
import EntityCard from "../components/EntityCard";
import { RouteDefinition } from "@/plugins/types";
import { useMemo } from "react";
import { RelationCountSummary } from "@/api/fastapi-schemas";
import { SearchIcon } from "lucide-react";
import { useDebouncedState } from "@mantine/hooks";

const EventOverview = () => {
  const { data: eventsAttributes = {} } = useEventAttributes();
  const { data: e2o } = useE2o();
  const { data: eventCounts, isLoading: isEventCountsLoading } =
    useEventCounts();

  const [searchValue, setSearchValue] = useDebouncedState("", 200);

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

  const filteredEvents = useMemo(() => {
    const toSearch = searchValue.toLowerCase();
    return Object.entries(eventCounts ?? {}).filter(
      ([event, _]) =>
        event.toLowerCase().includes(searchValue.toLowerCase()) ||
        relationMap[event].some(
          ({ target, qualifier }) =>
            target.toLowerCase().includes(toSearch) ||
            qualifier.toLowerCase().includes(toSearch),
        ) ||
        eventsAttributes[event].some(({ attribute }) =>
          attribute.toLowerCase().includes(toSearch),
        ),
    );
  }, [searchValue, relationMap, eventCounts, eventsAttributes]);

  return (
    <>
      <LoadingOverlay visible={isEventCountsLoading} />
      <Stack>
        <Input
          leftSection={<SearchIcon />}
          defaultValue={searchValue}
          onChange={(newSearch) => setSearchValue(newSearch.target.value)}
        />
        {eventCounts && (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
            {filteredEvents.map(([name, count]) => (
              <EntityCard
                key={name}
                count={count}
                name={name}
                attributeSummaries={eventsAttributes[name]}
                relationSummaries={relationMap[name]}
              />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </>
  );
};

export default EventOverview;

export const config: RouteDefinition = { name: "Event Overview" };
