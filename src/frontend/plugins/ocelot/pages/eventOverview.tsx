import {
  useE2o,
  useEventAttributes,
  useEventCounts,
} from "@/api/fastapi/info/info";
import { Input, LoadingOverlay, Stack } from "@mantine/core";
import { RouteDefinition } from "@/plugins/types";
import { SearchIcon } from "lucide-react";
import { useDebouncedState } from "@mantine/hooks";
import EntityOverview from "../components/EntityOverview";

const EventOverview = () => {
  const { data: eventsAttributes = {} } = useEventAttributes();
  const { data: e2o = [] } = useE2o();
  const { data: eventCounts, isLoading: isEventCountsLoading } =
    useEventCounts();

  const [searchValue, setSearchValue] = useDebouncedState("", 200);
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
          <EntityOverview
            relations={e2o}
            entityCounts={eventCounts}
            attributes={eventsAttributes}
            search={searchValue}
          />
        )}
      </Stack>
    </>
  );
};

export default EventOverview;

export const config: RouteDefinition = { name: "Event Overview" };
