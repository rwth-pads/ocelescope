import { ResourceType, ResourceViewDefinition } from "@/types/resources";

export const defineResourceView = <K extends ResourceType>(
  def: ResourceViewDefinition<K>,
) => def;
