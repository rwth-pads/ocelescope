import {
  useE2o,
  useEventAttributes,
  useEventCounts,
} from "@/api/fastapi/ocels/ocels";
import { Input, LoadingOverlay, Stack } from "@mantine/core";
import { SearchIcon } from "lucide-react";
import { useDebouncedState } from "@mantine/hooks";
import EntityOverview from "../components/EntityOverview";
import { defineRoute } from "@/lib/plugins";

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

export default defineRoute({
  component: EventOverview,
  label: "Event Overview",
  name: "eventOverview",
});
