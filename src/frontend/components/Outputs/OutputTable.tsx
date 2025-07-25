import { useOutputs } from "@/api/fastapi/outputs/outputs";
import { Stack, ActionIcon, Title, Menu } from "@mantine/core";
import {
  Download,
  EllipsisVerticalIcon,
  FileUpIcon,
  Pencil,
  Trash,
} from "lucide-react";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";

const OutputTable: React.FC = () => {
  const { data: outputs } = useOutputs();
  return (
    <Stack gap={0}>
      <Title size={"h3"}>Outputs</Title>
      <DataTable
        columns={[
          { accessor: "name", title: "Name" },
          {
            accessor: "created_at",
            title: "Created At",
            render: ({ created_at }) =>
              dayjs(created_at).format("YYYY-MM-DD HH:mm"),
          },
          { accessor: "type_label", title: "Type" },
          {
            accessor: "actions",
            textAlign: "right",
            title: (
              <ActionIcon variant="subtle">
                <FileUpIcon size={20} />
              </ActionIcon>
            ),
            render: ({}) => (
              <Menu width={200} position="left-start">
                <Menu.Target>
                  <ActionIcon
                    p={0}
                    variant="subtle"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EllipsisVerticalIcon />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item
                    onClick={(e) => {}}
                    leftSection={<Pencil size={16} />}
                  >
                    Rename
                  </Menu.Item>
                  <Menu.Sub>
                    <Menu.Sub.Target>
                      <Menu.Sub.Item leftSection={<Download size={16} />}>
                        Download
                      </Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                      {[".xml", ".sqlite", ".json"].map((ext) => (
                        <Menu.Item component={"a"}>{ext}</Menu.Item>
                      ))}
                    </Menu.Sub.Dropdown>
                  </Menu.Sub>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<Trash size={16} color={"red"} />}
                    color="red"
                    fw="bold"
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ),
          },
        ]}
        records={outputs}
      />
    </Stack>
  );
};

export default OutputTable;
