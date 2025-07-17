declare module "cytoscape-dagre" {
  const extension: (cytoscape: typeof cytoscape) => void;
  export default extension;
}
