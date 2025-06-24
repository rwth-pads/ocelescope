import { Resource } from "@/api/fastapi-schemas";
import {
  useDeleteResource,
  useGetResources,
} from "@/api/fastapi/resource/resource";
import {
  Box,
  Button,
  LoadingOverlay,
  Menu,
  Modal,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Download, EllipsisVerticalIcon, Trash } from "lucide-react";
import { useState } from "react";
import ResourceView from "../Resource";

const ResourceTable = () => {
  const { data: resources = [], refetch: refetchResources } = useGetResources();
  const { mutate: deleteResource } = useDeleteResource({
    mutation: { onSuccess: async () => await refetchResources() },
  });

  const [openedResource, setOpenedResource] = useState<Resource | undefined>(
    undefined,
  );

  return (
    <>
      <Modal
        opened={!!openedResource}
        onClose={() => setOpenedResource(undefined)}
        title={openedResource?.name}
        size={"auto"}
      >
        <Box w={700} h={700}>
          {openedResource && (
            <ResourceView resource={openedResource.resource} />
          )}
        </Box>
      </Modal>
      <Stack gap={0}>
        <Title size={"h2"}>Resources</Title>
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Created At</Table.Th>
              <Table.Th>Source</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {resources.map((resource) => (
              <Table.Tr
                key={resource.id}
                onClick={() => setOpenedResource(resource)}
              >
                <Table.Td>{resource.name}</Table.Td>
                <Table.Td>{resource.resource.type}</Table.Td>
                <Table.Td>{resource.created_at}</Table.Td>
                <Table.Td>{resource.source}</Table.Td>
                <Table.Td align="right" px={0}>
                  <Menu width={200} position="left-start">
                    <Menu.Target>
                      <Button
                        p={0}
                        variant="subtle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EllipsisVerticalIcon />
                      </Button>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Item disabled leftSection={<Download size={16} />}>
                        Download
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<Trash size={16} color={"red"} />}
                        color="red"
                        fw="bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteResource({ resourceId: resource.id });
                        }}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </>
  );
};

export default ResourceTable;
