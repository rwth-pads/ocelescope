import { BaseLayoutOptions } from "cytoscape";
import { Core } from "cytoscape";
import { createContext, useContext } from "react";

export type CytoscapeContextType = {
  cy: React.RefObject<Core | null>;
  layout: BaseLayoutOptions;
};

export const CytoscapeContext = createContext<CytoscapeContextType | undefined>(
  undefined,
);

export const useCytoscapeContext = () => {
  const context = useContext(CytoscapeContext);
  if (!context) {
    throw new Error("useCytoscapeContext must be used within a CytoscapeGraph");
  }
  return context;
};
