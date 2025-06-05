import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import {
  usePaginatedEvents,
  usePaginatedObjects,
} from "@/api/fastapi/ocelot/ocelot";
import EntityTable from "@/components/EntityTable/EntityTable";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { keepPreviousData } from "@tanstack/react-query";

import { useEffect, useMemo, useState } from "react";

const EntityPage: React.FC<{ type: "events" | "objects" }> = ({ type }) => {
  const { data: eventCounts } = useEventCounts(undefined, {
    query: { enabled: type === "events" },
  });
  const { data: objectCounts } = useObjectCount(undefined, {
    query: { enabled: type === "objects" },
  });

  const [currentTab, setCurrentTab] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: string; ascending: boolean }>();

  const entityCounts = type === "events" ? eventCounts : objectCounts;

  const entityNames = useMemo(
    () => Object.keys((type === "events" ? eventCounts : objectCounts) ?? {}),
    [eventCounts, objectCounts],
  );

  const { data: eventEntities } = usePaginatedEvents(
    {
      activity: currentTab,
      page_size: 20,
      page,
      ...(sort && { sort_by: sort.sortBy, ascending: sort.ascending }),
    },
    {
      query: {
        enabled: type === "events" && !!currentTab,
        placeholderData: keepPreviousData,
        staleTime: 5000,
      },
    },
  );
  const { data: objectEntities } = usePaginatedObjects(
    {
      object_type: currentTab,
      page_size: 20,
      page,
      ...(sort && { sort_by: sort.sortBy, ascending: sort.ascending }),
    },
    {
      query: {
        enabled: type === "objects" && !!currentTab,
        placeholderData: keepPreviousData,
        staleTime: 5000,
      },
    },
  );

  const entities = type === "events" ? eventEntities : objectEntities;

  useEffect(() => {
    if (!currentTab && entityNames.length > 0) {
      setCurrentTab(entityNames[0]);
    }
  }, [currentTab, entityNames]);

  if (entityNames.length === 0) return null;

  return (
    <>
      <SingleLineTabs
        tabs={Object.entries(entityCounts ?? {}).map(
          ([entityName, count]) => ({
            value: entityName,
            label: `${entityName} (${count})`,
          }),
        )}
        setCurrentTab={(newTab) => {
          setCurrentTab(newTab);
          setPage(1);
          setSort(undefined);
        }}
        currentTab={currentTab ?? entityNames[0]}
      />
      {

        entities && <EntityTable
          paginatedEntities={entities}
          onPageChange={setPage}
          onSort={setSort}
          sorted={sort}
        />
      }

    </>
  );
};

export default EntityPage;
