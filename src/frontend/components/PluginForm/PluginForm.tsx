import { BodyRunPluginInput, PluginMethod } from "@/api/fastapi-schemas";
import {
  Box,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Form from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import OcelSelect from "../OcelSelect/OcelSelect";
import { Controller, useForm } from "react-hook-form";
import { useGetOcels } from "@/api/fastapi/ocels/ocels";
import { useMemo } from "react";
import { useRunPlugin } from "@/api/fastapi/plugins/plugins";

type PluginFormProps = {
  pluginId: string;
  pluginMetod: PluginMethod;
};
const PluginForm: React.FC<PluginFormProps> = ({ pluginMetod, pluginId }) => {
  const { data } = useGetOcels();

  const { mutate } = useRunPlugin();
  const defaultValue = Object.fromEntries(
    pluginMetod.input_ocels.map(({ name }) => [name, ""]),
  );

  const autofilledDefaultValue = useMemo(
    () =>
      data?.current_ocel_id
        ? Object.fromEntries(
            pluginMetod.input_ocels.map(({ name }) => [
              name,
              data.current_ocel_id,
            ]),
          )
        : undefined,
    [data?.current_ocel_id],
  );

  const { control, handleSubmit } = useForm({
    defaultValues: defaultValue,
    values: autofilledDefaultValue,
  });

  return (
    <Container>
      <Stack gap={"md"}>
        <Stack gap={0}>
          <Title>{pluginMetod.label}</Title>
          <Text>{pluginMetod.description}</Text>
        </Stack>
        <Stack gap={0}>
          {(pluginMetod.input_ocels ?? []).map(
            ({ name, label, description }) => (
              <Controller
                control={control}
                name={name}
                rules={{ required: true }}
                render={({ field }) => (
                  <OcelSelect
                    label={label}
                    required
                    description={description}
                    onChange={field.onChange}
                    value={field.value}
                  />
                )}
              />
            ),
          )}
        </Stack>
        <Stack>
          {pluginMetod.input_model && (
            <Form
              schema={pluginMetod.input_model}
              validator={validator}
              onSubmit={({ formData }) =>
                handleSubmit((data) => {
                  mutate({
                    id: pluginId,
                    method: pluginMetod.name,
                    data: {
                      input: formData as BodyRunPluginInput,
                      input_ocels: data as Record<string, string>,
                    },
                  });
                })()
              }
              templates={{
                ButtonTemplates: {
                  SubmitButton: () => (
                    <Group align="center" justify="center">
                      <Button type="submit" color="green">
                        Run
                      </Button>
                    </Group>
                  ),
                },
                ObjectFieldTemplate: ({ properties, description }) => (
                  <Box style={{ padding: 0, border: "none" }}>
                    {description && <p>{description}</p>}
                    {properties.map((prop) => (
                      <Box key={prop.name} mb="sm">
                        {prop.content}
                      </Box>
                    ))}
                  </Box>
                ),
              }}
            />
          )}
        </Stack>
      </Stack>
    </Container>
  );
};

export default PluginForm;
