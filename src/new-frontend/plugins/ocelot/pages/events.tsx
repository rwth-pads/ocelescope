import { useEventInfo, usePaginatedEvents } from "@/api/fastapi/ocelot/ocelot";
import EntityTable from "@/components/EntityTable/EntityTable";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { RouteDefinition } from "@/plugins/types";
import {
  Button,
  Flex,
  Grid,
  ScrollArea,
  Tabs,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";

const PluginTestPage = () => {
  const { data: events, isSuccess } = useEventInfo();
  const [currentTab, setCurrentTab] = useState("");
  const { data: eventsEntities } = usePaginatedEvents(
    { activity: currentTab ?? events![0], page_size: 20 },
    { query: { enabled: isSuccess } },
  );

  if (!events) return null;

  return (
    <>
      <SingleLineTabs
        tabs={events}
        setCurrentTab={setCurrentTab}
        currentTab={currentTab ?? events[0]}
      />
      {eventsEntities && <EntityTable paginatedEntities={eventsEntities} />}
    </>
  );
};

export default PluginTestPage;

export const config: RouteDefinition = { name: "Events" };
