import { useEventCounts, useObjectCount } from "@/api/fastapi/ocels/ocels";
import assignUniqueColors from "@/util/colors";
import { PieChart } from "@mantine/charts";
import { Flex } from "@mantine/core";
import { ComponentProps, useMemo } from "react";
import ColorLegend from "./ColorLegend";

const EntityCountPieChart: React.FC<
  {
    ocelId: string;
    useEntityCount: typeof useEventCounts | typeof useObjectCount;
  } & Omit<ComponentProps<typeof PieChart>, "data">
> = ({ ocelId, useEntityCount, ...props }) => {
  const { data: entityCounts = {} } = useEntityCount({ ocel_id: ocelId });

  const colorMap = assignUniqueColors(Object.keys(entityCounts));

  const data = useMemo(
    () =>
      Object.entries(entityCounts).map(([entityName, count]) => ({
        name: entityName,
        value: count,
        color: colorMap[entityName],
      })),
    [entityCounts],
  );

  return (
    <Flex align="center" gap={"xs"} wrap={"nowrap"}>
      <PieChart data={data} {...props} />
      <ColorLegend data={data} />
    </Flex>
  );
};
export default EntityCountPieChart;
