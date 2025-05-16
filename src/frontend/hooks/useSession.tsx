import { useValidateSession } from "@/api/fastapi/default/default";

const useSession = () => {
  useValidateSession({
    query: {
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    },
  });
};
export default useSession;
