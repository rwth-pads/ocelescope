import { FilterPipeLinePipelineItem } from "@/api/fastapi-schemas";

export type FilterConfig = FilterPipeLinePipelineItem;
export type FilterType = Pick<FilterConfig, "type">["type"];

export type ConfigByType<T extends FilterType> = Extract<
  FilterPipeLinePipelineItem,
  { type: T }
>;
