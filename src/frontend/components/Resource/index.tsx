import {
  GetResources200Item,
  ObjectCentricDirectlyFollowsGraph,
  ObjectCentricPetriNet,
  Ocdfg as OcdfgType,
} from "@/api/fastapi-schemas";
import Ocdfg from "./Ocdfg";
import PetriNet from "./Ocpn";

const ResourceView: React.FC<{ resource: GetResources200Item }> = (s) => {
  if (s.resource.type === "ocdfg") {
    return <Ocdfg ocdfg={s.resource} />;
  }
  if (s.resource.type === "ocpn") {
    return <PetriNet ocpn={s.resource} />;
  }

  return <></>;
};

export default ResourceView;
