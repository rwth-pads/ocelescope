import { BodyRunPluginInput, PluginMethod } from "@/api/fastapi-schemas";
import { Box, Button, Group, Stack } from "@mantine/core";
import Form from "@aokiapp/rjsf-mantine-theme";
import validator from "@rjsf/validator-ajv8";
import OcelSelect from "../OcelSelect/OcelSelect";
import { Controller, useForm } from "react-hook-form";
import { useGetOcels } from "@/api/fastapi/ocels/ocels";
import { useMemo } from "react";
import { useRunPlugin } from "@/api/fastapi/plugins/plugins";

type PluginFormProps = {
  pluginName: string;
  pluginVersion: string;
  pluginMethod: PluginMethod;
  onSuccess: (taskId: string) => void;
};
const PluginForm: React.FC<PluginFormProps> = ({
  pluginMethod,
  pluginName,
  pluginVersion,
  onSuccess,
}) => {
  const { data } = useGetOcels();

  const { mutate } = useRunPlugin({ mutation: { onSuccess } });
  const defaultValue = Object.fromEntries(
    pluginMethod.input_ocels.map(({ name }) => [name, ""]),
  );

  const autofilledDefaultValue = useMemo(
    () =>
      data?.current_ocel_id
        ? Object.fromEntries(
            pluginMethod.input_ocels.map(({ name }) => [
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
    <>
      <Stack gap={0}>
        {(pluginMethod.input_ocels ?? []).map(
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
      {pluginMethod.input_model && (
        <Form
          schema={pluginMethod.input_model}
          validator={validator}
          onSubmit={({ formData }) =>
            handleSubmit((data) => {
              mutate({
                name: pluginName,
                version: pluginVersion,
                method: pluginMethod.name,
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
    </>
  );
};

export default PluginForm;
