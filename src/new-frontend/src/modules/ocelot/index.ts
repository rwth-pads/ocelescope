import { defineModule } from "@/lib/modules";
import OcelotIcon from "./icon";

export default defineModule({
  name: "ocelot",
  description:
    "A tool for exploring object-centric event logs, allowing yout to search events and objects and visualize their relationships and attributes.",
  label: "Ocelot",
  authors: [{ name: "Öztürk, Görkem-Emre" }],
  routes: [],
  icon: OcelotIcon,
});
