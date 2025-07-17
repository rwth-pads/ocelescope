import {
  FilterPipelineItem,
  Filter as FilterGenerated,
} from "@/api/fastapi-schemas";

export type Filter = FilterGenerated;
export type FilterConfig = FilterPipelineItem;
export type FilterType = Pick<FilterConfig, "type">["type"];

export type ConfigByType<T extends FilterType> = Extract<
  FilterConfig,
  { type: T }
>;
