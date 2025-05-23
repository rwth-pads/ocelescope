import { useEventCounts } from "@/api/fastapi/info/info";
import { useEventInfo, usePaginatedEvents } from "@/api/fastapi/ocelot/ocelot";
import EntityTable from "@/components/EntityTable/EntityTable";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { RouteDefinition } from "@/plugins/types";
import { keepPreviousData } from "@tanstack/react-query";

import { useEffect, useMemo, useState } from "react";

const EventPage = () => {
  const { data: eventCounts, isSuccess } = useEventCounts();
  const [currentTab, setCurrentTab] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: string; ascending: boolean }>();

  const eventNames = useMemo(
    () => Object.keys(eventCounts ?? {}),
    [eventCounts],
  );

  const { data: eventsEntities } = usePaginatedEvents(
    {
      activity: currentTab,
      page_size: 20,
      page,
      ...(sort && { sort_by: sort.sortBy, ascending: sort.ascending }),
    },
    {
      query: {
        enabled: isSuccess && currentTab !== "",
        placeholderData: keepPreviousData,
        staleTime: 5000,
      },
    },
  );

  useEffect(() => {
    if (!currentTab && eventNames?.[0]) {
      setCurrentTab(eventNames[0]);
    }
  }, [currentTab, eventCounts]);

  if (!eventCounts) return null;

  return (
    <>
      {eventCounts && (
        <>
          <SingleLineTabs
            tabs={Object.entries(eventCounts).map(([activityName, count]) => ({
              value: activityName,
              label: `${activityName} (${count})`,
            }))}
            setCurrentTab={(newTab) => {
              setCurrentTab(newTab);
              setPage(1);
              setSort(undefined);
            }}
            currentTab={currentTab ?? eventCounts[0]}
          />
        </>
      )}
      {eventsEntities && (
        <>
          <EntityTable
            paginatedEntities={eventsEntities}
            onPageChange={setPage}
            onSort={setSort}
            sorted={sort}
          />
        </>
      )}
    </>
  );
};

export default EventPage;

export const config: RouteDefinition = { name: "Events" };
