import { useEventInfo, usePaginatedEvents } from "@/api/fastapi/ocelot/ocelot";
import EntityTable from "@/components/EntityTable/EntityTable";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { RouteDefinition } from "@/plugins/types";
import {
  keepPreviousData,
} from '@tanstack/react-query'

import { useEffect, useState } from "react";

const PluginTestPage = () => {
  const { data: events, isSuccess } = useEventInfo();
  const [currentTab, setCurrentTab] = useState("");
  const [page, setPage] = useState(1)
  const { data: eventsEntities } = usePaginatedEvents(
    { activity: currentTab, page_size: 20, page },
    { query: { enabled: isSuccess, placeholderData: keepPreviousData, staleTime: 5000 } },
  );

  useEffect(() => {
    if (!currentTab && events?.[0]) {
      setCurrentTab(events[0]);
    }
  }, [currentTab, events]);

  if (!events) return null;

  return (
    <>
      {events && (
        <>
          <SingleLineTabs
            tabs={events}
            setCurrentTab={(newTab) => { setCurrentTab(newTab); setPage(1) }}
            currentTab={currentTab ?? events[0]}
          />
        </>
      )}
      {eventsEntities && (
        <>
          <EntityTable paginatedEntities={eventsEntities} onPageChange={setPage} />

        </>
      )}
    </>
  );
};

export default PluginTestPage;

export const config: RouteDefinition = { name: "Events" };
