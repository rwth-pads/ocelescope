import OcelTable from "@/components/OcelTable/OcelTable";
import ResourceTable from "@/components/ResourceTable/ResourceTable";
import { Container, Stack } from "@mantine/core";

const Overview = () => {
  return (
    <Container>
      <Stack gap={"xl"}>
        <OcelTable />
        <ResourceTable />
      </Stack>
    </Container>
  );
};

export default Overview;
