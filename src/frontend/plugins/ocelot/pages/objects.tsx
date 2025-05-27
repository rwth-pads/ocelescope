import { useObjectCount } from "@/api/fastapi/info/info";
import { usePaginatedObjects } from "@/api/fastapi/ocelot/ocelot";
import EntityTable from "@/components/EntityTable/EntityTable";
import SingleLineTabs from "@/components/SingleLineTabs/SingleLineTabs";
import { RouteDefinition } from "@/plugins/types";
import { keepPreviousData } from "@tanstack/react-query";

import { useEffect, useMemo, useState } from "react";

const ObjectPage = () => {
  const { data: objectCounts, isSuccess } = useObjectCount();
  const [currentTab, setCurrentTab] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ sortBy: string; ascending: boolean }>();

  const objectNames = useMemo(
    () => Object.keys(objectCounts ?? {}),
    [objectCounts],
  );
  const { data: objectsEntities } = usePaginatedObjects(
    {
      object_type: currentTab,
      page_size: 20,
      page,
      ...(sort && { sort_by: sort.sortBy, ascending: sort.ascending }),
    },
    {
      query: {
        enabled: currentTab !== "",
        placeholderData: keepPreviousData,
        staleTime: 5000,
      },
    },
  );

  useEffect(() => {
    if (!currentTab && objectNames?.[0]) {
      setCurrentTab(objectNames[0]);
    }
  }, [currentTab, objectNames]);

  if (!objectCounts) return null;

  return (
    <>
      {objectNames && (
        <>
          <SingleLineTabs
            tabs={Object.entries(objectCounts).map(([activityName, count]) => ({
              value: activityName,
              label: `${activityName} (${count})`,
            }))}
            setCurrentTab={(newTab) => {
              setCurrentTab(newTab);
              setPage(1);
              setSort(undefined);
            }}
            currentTab={currentTab ?? objectNames[0]}
          />
        </>
      )}
      {objectsEntities && (
        <>
          <EntityTable
            paginatedEntities={objectsEntities}
            onPageChange={setPage}
            onSort={setSort}
            sorted={sort}
          />
        </>
      )}
    </>
  );
};

export default ObjectPage;

export const config: RouteDefinition = { name: "Objects" };
