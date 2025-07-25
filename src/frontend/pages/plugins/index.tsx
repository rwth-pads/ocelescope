import { usePlugins } from "@/api/fastapi/plugins/plugins";
import { Title, Container, ActionIcon, Group } from "@mantine/core";
import { Play } from "lucide-react";
import { DataTable } from "mantine-datatable";
import Link from "next/link";
import { useState } from "react";

const PluginOverview: React.FC = () => {
  const { data: plugins } = usePlugins();

  const [expandedPlugins, setExpandedPlugins] = useState<string[]>([]);

  return (
    <Container>
      <Title size={"h3"}> Plugins</Title>
      <DataTable
        columns={[
          { title: "Name", accessor: "metadata.label" },
          { title: "Description", accessor: "metadata.description" },
          { title: "Version", accessor: "metadata.version" },
        ]}
        records={plugins}
        rowExpansion={{
          allowMultiple: false,
          expanded: {
            recordIds: expandedPlugins,
            onRecordIdsChange: setExpandedPlugins,
          },
          content: ({ record }) => {
            return (
              <DataTable
                noHeader
                columns={[
                  { accessor: "label" },
                  { accessor: "description" },
                  {
                    accessor: "actions",
                    title: "",
                    width: "0%", // 👈 set width to 0%
                    textAlign: "right",
                    render: ({ name }) => (
                      <Group align="center">
                        <ActionIcon
                          size={"md"}
                          component={Link}
                          href={{
                            query: { version: record.metadata.version },
                            pathname: `plugins/${record.metadata.name}/${name}`,
                          }}
                          color="green"
                          variant="subtle"
                        >
                          <Play />
                        </ActionIcon>
                      </Group>
                    ),
                  },
                ]}
                records={Object.values(record.methods)}
              />
            );
          },
        }}
      />
    </Container>
  );
};

export default PluginOverview;
