import { useGetFilters, useSetFilters } from "@/api/fastapi/filter/filter";
import FilterPipelineForm from "@/components/Filters";
import { Button, Container, LoadingOverlay, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

const FilterPage = () => {
  const {
    query: { slug },
  } = useRouter();
  const queryClient = useQueryClient();
  const { data: filter, isLoading } = useGetFilters({ ocel_id: slug?.[0] });
  const { mutate, isPending } = useSetFilters({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ refetchType: "all" });
      },
    },
  });
  return (
    <>
      <LoadingOverlay visible={isLoading || isPending} />
      {filter && (
        <FilterPipelineForm
          filter={filter}
          submit={(filter) =>
            mutate({ data: filter, params: { ocel_id: slug?.[0] } })
          }
          ocel_id={slug?.[0]}
        />
      )}
    </>
  );
};
export default FilterPage;
