import { Output200 } from "@/api/fastapi-schemas";

export type VisulizationsType = Output200;
export type VisulizationsTypes = NonNullable<VisulizationsType["type"]>;

export type VisualizationByType<T extends VisulizationsTypes> = Extract<
  VisulizationsType,
  { type: T }
>;
