import { useImportOcel } from "@/api/fastapi/default/default";
import { useGetOcels } from "@/api/fastapi/session/session";
import { Container, Table, Title } from "@mantine/core";

const Overview = () => {
  const { data: ocels } = useGetOcels();
  return (
    <Container>
      <Title>OCELS</Title>

      <Table.ScrollContainer minWidth={800}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Uploaded At</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(ocels ?? []).map(({ name, created_at }) => (
              <Table.Tr>
                <Table.Td>{name}</Table.Td>
                <Table.Td>{created_at}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Container>
  );
};

export default Overview;
