import OcelTable from "@/components/OcelTable/OcelTable";
import { Container, Stack } from "@mantine/core";

const Overview = () => {
  return (
    <Container>
      <Stack gap={"xl"}>
        <OcelTable />
      </Stack>
    </Container>
  );
};

export default Overview;
