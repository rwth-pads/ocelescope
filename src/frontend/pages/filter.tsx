import { useGetFilters, useSetFilters } from "@/api/fastapi/filter/filter";
import { FilterForm } from "@/components/OcelFilter";
import { Button, Container, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";

const FilterPage = () => {
  const queryClient = useQueryClient();
  const { data: filter = { pipeline: [] } } = useGetFilters();
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
            mutate({ data: { pipeline } });
          }}
          initialFilter={filter.pipeline}
        />
      )}
    </Container>
  );
};

export default FilterPage;
