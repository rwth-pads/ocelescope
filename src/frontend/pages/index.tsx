import { useGetOcels, useSetCurrentOcel } from "@/api/fastapi/session/session";
import OcelUpload from "@/components/OcelUpload/OcelUpload";
import { Button, Container, Menu, Modal, Table, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVerticalIcon, FileUp, StarIcon } from "lucide-react";
import { useState } from "react";

const Overview = () => {
  const queryClient = useQueryClient();
  const { data: ocels } = useGetOcels();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { mutate: setCurrentOcel } = useSetCurrentOcel({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ refetchType: "all" });
      },
    },
  });

  return (
    <>
      <Modal
        opened={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        size={"xl"}
        withCloseButton={false}
        styles={{
          content: {
            backgroundColor: "transparent", // removes background
            boxShadow: "none", // optional: removes drop shadow
          },
        }}
      >
        <OcelUpload
          onUpload={async () => {
            await queryClient.invalidateQueries();
            setIsUploadModalOpen(false);
          }}
        />
      </Modal>

      <Container>
        <Title>OCELS</Title>
        {ocels && ocels.ocels.length > 0 ? (
          <Table.ScrollContainer minWidth={800}>
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th />
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Uploaded At</Table.Th>
                  <Table.Th>Extensions</Table.Th>
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
                {(ocels.ocels ?? []).map(
                  ({ id, name, created_at, extensions }) => (
                    <Table.Tr
                      key={id}
                      onClick={() =>
                        setCurrentOcel({ params: { ocel_id: id } })
                      }
                    >
                      <Table.Td>
                        {id === ocels.current_ocel_id && (
                          <StarIcon size={14} fill="blue" color="blue" />
                        )}
                      </Table.Td>
                      <Table.Td>{name}</Table.Td>
                      <Table.Td>{created_at}</Table.Td>
                      <Table.Td>{extensions}</Table.Td>
                      <Table.Td align="right" px={0}>
                        <Menu width={200} position="left-start">
                          <Menu.Target>
                            <Button p={0} variant="subtle">
                              <EllipsisVerticalIcon />
                            </Button>
                          </Menu.Target>

                          <Menu.Dropdown>
                            <Menu.Item>Dashboard</Menu.Item>

                            <Menu.Sub>
                              <Menu.Sub.Target>
                                <Menu.Sub.Item>Products</Menu.Sub.Item>
                              </Menu.Sub.Target>

                              <Menu.Sub.Dropdown>
                                <Menu.Item>All products</Menu.Item>
                                <Menu.Item>Categories</Menu.Item>
                                <Menu.Item>Tags</Menu.Item>
                                <Menu.Item>Attributes</Menu.Item>
                                <Menu.Item>Shipping classes</Menu.Item>
                              </Menu.Sub.Dropdown>
                            </Menu.Sub>

                            <Menu.Sub>
                              <Menu.Sub.Target>
                                <Menu.Sub.Item>Orders</Menu.Sub.Item>
                              </Menu.Sub.Target>

                              <Menu.Sub.Dropdown>
                                <Menu.Item>Open</Menu.Item>
                                <Menu.Item>Completed</Menu.Item>
                                <Menu.Item>Cancelled</Menu.Item>
                              </Menu.Sub.Dropdown>
                            </Menu.Sub>

                            <Menu.Sub>
                              <Menu.Sub.Target>
                                <Menu.Sub.Item>Settings</Menu.Sub.Item>
                              </Menu.Sub.Target>

                              <Menu.Sub.Dropdown>
                                <Menu.Item>Profile</Menu.Item>
                                <Menu.Item>Security</Menu.Item>
                                <Menu.Item>Notifications</Menu.Item>
                              </Menu.Sub.Dropdown>
                            </Menu.Sub>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  ),
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <OcelUpload onUpload={() => queryClient.invalidateQueries()} />
        )}
      </Container>
    </>
  );
};

export default Overview;
