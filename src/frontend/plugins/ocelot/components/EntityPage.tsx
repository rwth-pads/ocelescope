import {
  useE2o,
  useEventAttributes,
  useEventCounts,
  useO2o,
  useObjectAttributes,
  useObjectCount,
} from "@/api/fastapi/info/info";
import {
  usePaginatedEvents,
  usePaginatedObjects,
} from "@/api/fastapi/ocelot/ocelot";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { keepPreviousData } from "@tanstack/react-query";

import { useEffect, useMemo, useState } from "react";
import EntityTable from "./EntityTable";
import { Flex } from "@mantine/core";
import { DataTableSortStatus } from "mantine-datatable";

const EntityPage: React.FC<{ type: "events" | "objects" }> = ({ type }) => {
  const { data: eventCounts } = useEventCounts(undefined, {
    query: { enabled: type === "events" },
  });
  const { data: objectCounts } = useObjectCount(undefined, {
    query: { enabled: type === "objects" },
  });

  const { data: eventAttributes } = useEventAttributes(undefined, {
    query: { enabled: type === "events" },
  });
  const { data: objectAttributes } = useObjectAttributes(undefined, {
    query: { enabled: type === "objects" },
  });

  const attributes = type === "events" ? eventAttributes : objectAttributes;

  const [currentTab, setCurrentTab] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSortStatus | undefined>(undefined);

  const [pageSize, setPageSize] = useState(20);

  const entityCounts = type === "events" ? eventCounts : objectCounts;

  const entityNames = useMemo(
    () => Object.keys((type === "events" ? eventCounts : objectCounts) ?? {}),
    [eventCounts, objectCounts],
  );

  const { data: o2o } = useO2o();
  const { data: e2o } = useE2o();

  const relations = useMemo(() => {
    const relations = (type === "events" ? e2o : o2o) ?? [];

    return relations.filter(({ source }) => source === currentTab);
  }, [e2o, o2o, currentTab]);

  const { data: eventEntities } = usePaginatedEvents(
    {
      activity: currentTab,
      page_size: pageSize,
      page,
      ...(sort && {
        sort_by: sort.columnAccessor,
        ascending: sort.direction === "asc",
      }),
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
      page_size: pageSize,
      page,
      ...(sort && {
        sort_by: sort.columnAccessor,
        ascending: sort.direction === "asc",
      }),
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
    <Flex direction={"column"} h={"100%"}>
      <SingleLineTabs
        tabs={Object.entries(entityCounts ?? {}).map(([entityName, count]) => ({
          value: entityName,
          label: `${entityName} (${count})`,
        }))}
        setCurrentTab={(newTab) => {
          setCurrentTab(newTab);
          setPage(1);
          setSort(undefined);
        }}
        currentTab={currentTab ?? entityNames[0]}
      />
      {entities && (
        <EntityTable
          entities={entities}
          attributes={attributes?.[currentTab ?? entityNames[0]]}
          withTimestamp={type === "events"}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          relations={relations}
          sortStatus={sort}
          onStartStatusChange={(sortStatus) => setSort(sortStatus)}
        />
      )}
    </Flex>
  );
};

export default EntityPage;
