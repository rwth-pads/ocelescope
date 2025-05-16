import { useEventInfo, usePaginatedEvents } from "@/api/fastapi/ocelot/ocelot";
import OcelEntityTable from "@/components/OcelEntityTable";
import { RouteDefinition } from "@/plugins/types";
import Pagination from "../components/Pagination";
import { Button, Stack, Tab, Tabs } from "react-bootstrap";
import usePagination from "@/hooks/usePagination";
import { useState } from "react";

const EventTypes = () => {
  const { currentPage, handlePageChange } = usePagination();
  const { data: eventTypes } = useEventInfo();

  const [activeState, setActiveState] = useState(
    eventTypes ? eventTypes[0] : undefined,
  );

  const { data: events } = usePaginatedEvents(
    {
      activity: activeState ?? eventTypes?.[0] ?? "",
      page: currentPage,
      page_size: 20,
    },
    {
      query: {
        enabled: !!eventTypes,
      },
    },
  );

  return (
    <Stack>
      {eventTypes && (
        <>
          <Tabs
            activeKey={activeState ?? eventTypes[0]}
            onSelect={(key) => {
              if (key) {
                setActiveState(key);
              }
            }}
          >
            {eventTypes.map((eventType) => (
              <Tab key={eventType} eventKey={eventType} title={eventType} />
            ))}
          </Tabs>
        </>
      )}

      {events && (
        <>
          <OcelEntityTable paginatedResponse={events} />
          <Pagination totalPages={events.total_pages} windowSize={10} />
        </>
      )}
    </Stack>
  );
};

export default EventTypes;

export const config: RouteDefinition = { name: "Event Types" };
