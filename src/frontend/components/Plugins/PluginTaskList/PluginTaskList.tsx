import { usePluginTasks } from "@/api/fastapi/tasks/tasks";
import { DataTable } from "mantine-datatable";

const PluginTaskList: React.FC<{
  pluginId?: string;
  methodName?: string;
  excludeFinished?: boolean;
}> = ({ pluginId, methodName, excludeFinished = false }) => {
  const { data: tasks = [] } = usePluginTasks({
    method_name: methodName ?? null,
    plugin_id: pluginId ?? null,
    only_running: excludeFinished,
  });

  return (
    <DataTable
      columns={[{ accessor: "id" }, { accessor: "state" }]}
      records={tasks}
    />
  );
};

export default PluginTaskList;
