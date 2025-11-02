import useCurrentOcel from "@/hooks/useCurrentOcel";
import { defineModuleRoute } from "@/lib/modules";
import { LoadingOverlay, SimpleGrid, useMatches } from "@mantine/core";
import EntityCountPieChart from "../components/EntityCountChart";
import { useEventCounts, useObjectCount } from "@/api/fastapi/ocels/ocels";
import StatCard from "../components/StatCard";

const StatisticsPage: React.FC = () => {
  const { id } = useCurrentOcel();

  const chartSize = useMatches({
    xs: 300,
    sm: 400,
  });

  if (!id) {
    return <LoadingOverlay visible />;
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }}>
      <StatCard title={"Activity Count"}>
        <EntityCountPieChart
          ocelId={id}
          size={chartSize}
          useEntityCount={useEventCounts}
        />
      </StatCard>
      <StatCard title={"Object Count"}>
        <EntityCountPieChart
          ocelId={id}
          size={chartSize}
          useEntityCount={useObjectCount}
        />
      </StatCard>
    </SimpleGrid>
  );
};

export default defineModuleRoute({
  component: StatisticsPage,
  label: "Statistics",
  name: "Statistics",
  requiresOcel: true,
});
