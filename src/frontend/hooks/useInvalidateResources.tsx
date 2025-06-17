import { useQueryClient } from "@tanstack/react-query";

const useInvalidateResources = () => {
  const queryclient = useQueryClient();

  return async () =>
    await queryclient.invalidateQueries({
      predicate: (query) => query.queryHash.includes("resource"),
    });
};

export default useInvalidateResources;
