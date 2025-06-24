import { Resource, ResourceResource } from "@/api/fastapi-schemas";
import Ocdfg from "./Ocdfg";
import PetriNet from "./Ocpn";
import Totem from "./Totem";

const ResourceView: React.FC<{ resource: ResourceResource }> = (s) => {
  if (s.resource.type === "ocdfg") {
    return <Ocdfg ocdfg={s.resource} />;
  }
  if (s.resource.type === "ocpn") {
    return <PetriNet ocpn={s.resource} />;
  }
  if (s.resource.type === "totem") {
    return <Totem totem={s.resource} />;
  }

  return <></>;
};

export default ResourceView;
