import { useGetFilters, useSetFilters } from "@/api/fastapi/filter/filter";
import { FilterForm } from "@/components/OcelFilter";
import { Button, Container, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

const FilterPage = () => {
  const {
    query: { slug },
  } = useRouter();
  const queryClient = useQueryClient();
  const { data: filter = { pipeline: [] } } = useGetFilters({
    ocel_id: slug?.[0],
  });
  const { mutate } = useSetFilters({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
      },
    },
  });
  return (
    <Container>
      <Title>Filters</Title>
      {filter && (
        <FilterForm
          onSubmit={(pipeline) => {
            mutate({ params: { ocel_id: slug?.[0] }, data: { pipeline } });
          }}
          initialFilter={filter.pipeline}
        />
      )}
    </Container>
  );
};

export default FilterPage;
