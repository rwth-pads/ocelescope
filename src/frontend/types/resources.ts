import { ResourceOutput } from "@/api/fastapi-schemas";

export type Resource = ResourceOutput;

export type ResourceEntity = Resource["entity"];

export type ResourceType = NonNullable<ResourceOutput["entity"]["type"]>;

export type ResourceByType<K extends ResourceType> = Extract<
  ResourceEntity,
  { type: K }
>;

export type ResourceViewProps<K extends ResourceType> = {
  resource?: ResourceByType<K>;
  children?: React.ReactNode;
};

export type ResourceViewDefinition<K extends ResourceType> = {
  type: K;
  viewer: React.ComponentType<ResourceViewProps<K>>;
};
