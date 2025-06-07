export type InputNode = {
  id: string;
  label: string;
};

export type InputEdge = {
  from: string;
  to: string;
};

export type InputGraph = {
  nodes: InputNode[];
  edges: InputEdge[];
};
