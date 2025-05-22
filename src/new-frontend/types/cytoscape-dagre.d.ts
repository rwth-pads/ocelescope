declare module "cytoscape-dagre" {
  import cytoscape from "cytoscape";

  const extension: (cytoscape: typeof cytoscape) => void;
  export default extension;
}
