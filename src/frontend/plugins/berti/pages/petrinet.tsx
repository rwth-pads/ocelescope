import { usePetriNet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import PetriNet from "../components/PetriNet";

const PetriNetPage = () => {
  const { data: pnet } = usePetriNet();
  return pnet && <PetriNet ocpn={pnet} />;
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
