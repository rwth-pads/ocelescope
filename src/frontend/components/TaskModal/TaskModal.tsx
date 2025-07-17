import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { LoadingOverlay, Box } from "@mantine/core";
import { useGetTask } from "@/api/fastapi/tasks/tasks";

type ShowTaskModalArgs = {
  taskId: string;
  onSuccess?: () => void;
};

type TaskModalContextType = {
  showTaskModal: (args: ShowTaskModalArgs) => void;
};

const TaskModalContext = createContext<TaskModalContextType>({
  showTaskModal: () => {},
});

export const useTaskModal = () => useContext(TaskModalContext);

export const TaskModalProvider = ({ children }: { children: ReactNode }) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccess, setOnSuccess] = useState<(() => void) | undefined>();

  const showTaskModal = useCallback(
    ({ taskId, onSuccess }: ShowTaskModalArgs) => {
      setTaskId(taskId);
      setOnSuccess(() => onSuccess);
      setIsOpen(true);
    },
    [],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setTaskId(null);
    setOnSuccess(undefined);
  }, []);

  const { data: task } = useGetTask(taskId!, {
    query: {
      enabled: !!taskId,

      refetchInterval: ({ state }) =>
        state.data?.state === "SUCCESS" ? false : 2000,
    },
  });

  useEffect(() => {
    if (task?.state === "SUCCESS") {
      onSuccess?.();
      close();
    }
  }, [task]);

  return (
    <TaskModalContext.Provider value={{ showTaskModal }}>
      <Box pos="relative" h={"100%"} w={"100%"}>
        {children}
        <LoadingOverlay
          visible={isOpen}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
      </Box>
    </TaskModalContext.Provider>
  );
};
