import { useImportOcel } from "@/api/fastapi/default/default";
import { useGetOcels, useSetCurrentOcel } from "@/api/fastapi/session/session";
import { Container, Table, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { StarIcon } from "lucide-react";

const Overview = () => {
  const queryClient = useQueryClient();
  const { data: ocels } = useGetOcels();
  const { mutate: setCurrentOcel } = useSetCurrentOcel({
    mutation: {
      onSuccess: async () => {
        queryClient.invalidateQueries();
      },
    },
  });

  return (
    <Container>
      <Title>OCELS</Title>

      {ocels && (
        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th></Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Uploaded At</Table.Th>
                <Table.Th>Extensions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(ocels.ocels ?? []).map(
                ({ id, name, created_at, extensions }) => (
                  <Table.Tr
                    key={id}
                    onClick={() => setCurrentOcel({ params: { ocel_id: id } })}
                  >
                    <Table.Td>
                      {id === ocels.current_ocel_id && (
                        <StarIcon size={14} fill="blue" color="blue" />
                      )}
                    </Table.Td>
                    <Table.Td>{name}</Table.Td>
                    <Table.Td>{created_at}</Table.Td>
                    <Table.Td>{extensions}</Table.Td>
                  </Table.Tr>
                ),
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Container>
  );
};

export default Overview;
