import { ResourceOutput } from "@/api/fastapi-schemas";
import {
  useDeleteResource,
  useGetResources,
  useUpdateResource,
} from "@/api/fastapi/resource/resource";
import {
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Stack,
  Table,
  TextInput,
  Title,
} from "@mantine/core";
import {
  Check,
  Download,
  EllipsisVerticalIcon,
  FileUp,
  Pencil,
  Trash,
  X,
} from "lucide-react";
import { useState } from "react";
import ResourceView from "../Resource";
import ResourceUpload from "../ResourceUpload/ResourceUpload";

const ResourceTable = () => {
  const { data: resources = [], refetch: refetchResources } = useGetResources();
  const { mutate: deleteResource } = useDeleteResource({
    mutation: { onSuccess: async () => await refetchResources() },
  });

  const { mutate: renameResource } = useUpdateResource({
    mutation: {
      onSuccess: async () => {
        await refetchResources();
        setRenamedResource(undefined);
      },
    },
  });

  const [openedResource, setOpenedResource] = useState<
    ResourceOutput | undefined
  >(undefined);

  const [renamedResource, setRenamedResource] = useState<
    { id: string; value: string } | undefined
  >(undefined);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  return (
    <>
      <Modal
        opened={!!openedResource}
        onClose={() => setOpenedResource(undefined)}
        title={openedResource?.name}
        size={"auto"}
      >
        <Box w={700} h={700}>
          {openedResource && <ResourceView resource={openedResource.entity} />}
        </Box>
      </Modal>
      <Modal
        opened={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: "transparent", // removes background
            boxShadow: "none", // optional: removes drop shadow
          },
        }}
      >
        <ResourceUpload
          onSuccess={() => {
            refetchResources();
            setIsUploadModalOpen(false);
          }}
        />
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
              <Table.Th
                style={{ display: "flex", justifyContent: "end" }}
                px={0}
                align="right"
              >
                <Button
                  variant="subtle"
                  p={0}
                  w={30}
                  h={30}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  <FileUp size={20} />
                </Button>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {resources.map((resource) => (
              <Table.Tr
                key={resource.id}
                onClick={() => setOpenedResource(resource)}
              >
                <Table.Td>
                  {renamedResource?.id !== resource.id ? (
                    <>{resource.name}</>
                  ) : (
                    <Group>
                      <TextInput
                        value={renamedResource.value}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        onChange={(newName) =>
                          setRenamedResource({
                            id: resource.id,
                            value: newName.currentTarget.value,
                          })
                        }
                      />
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          renameResource({
                            resourceId: renamedResource.id,
                            params: { name: renamedResource.value },
                          });
                        }}
                        size={"xs"}
                        color="green"
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();

                          setRenamedResource(undefined);
                        }}
                        size={"xs"}
                        color="red"
                      >
                        <X size={16} />
                      </Button>
                    </Group>
                  )}
                </Table.Td>
                <Table.Td>{resource.entity.type}</Table.Td>
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
                      <Menu.Item
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamedResource({
                            id: resource.id,
                            value: resource.name,
                          });
                        }}
                        leftSection={<Pencil size={16} />}
                      >
                        Rename
                      </Menu.Item>
                      <Menu.Item
                        component={"a"}
                        href={`http://localhost:8000/resource/${resource.id}/download`}
                        leftSection={<Download size={16} />}
                        onClick={(event) => event.stopPropagation()}
                      >
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
