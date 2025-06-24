import { Button, Slider, Stack, Text, Title } from "@mantine/core";
import useTotemStore from "../store";
import { Controller, useForm } from "react-hook-form";

const TotemForm: React.FC = () => {
  const tau = useTotemStore((state) => state.tau);
  const setTau = useTotemStore((state) => state.setTau);

  const { control, handleSubmit } = useForm({ defaultValues: { tau } });
  return (
    <Stack
      component={"form"}
      onSubmit={handleSubmit((data) => setTau(data.tau))}
    >
      <Title size={"h3"}>Options</Title>
      <Stack gap={0}>
        <Text>Fiter Noise</Text>
        <Controller
          control={control}
          name="tau"
          render={({ field }) => (
            <Slider
              value={Math.ceil(field.value * 100)}
              label={(value) => `${value}%`}
              onChange={(newTau) => field.onChange(newTau * 0.01)}
            />
          )}
        />
      </Stack>
      <Button color="green" type={"submit"}>
        Apply
      </Button>
    </Stack>
  );
};

export default TotemForm;
