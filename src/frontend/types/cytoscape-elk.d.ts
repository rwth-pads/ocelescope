declare module "cytoscape-elk" {
  import cytoscape from "cytoscape";
  const register: (cy: typeof cytoscape) => void;
  export default register;
}
