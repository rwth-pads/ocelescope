import { defineModule } from "@/lib/modules";
import eventRoute from "./pages/events";
import eventOverviewRoute from "./pages/eventOverview";
import objectsRoute from "./pages/objects";
import objectsOverviewRoute from "./pages/objectOverview";
import OcelotIcon from "./icon";

export default defineModule({
  name: "ocelot",
  description:
    "A tool for exploring object-centric event logs, allowing yout to search events and objects and visualize their relationships and attributes.",
  label: "Ocelot",
  authors: [{ name: "Öztürk, Görkem-Emre" }],
  routes: [eventRoute, objectsRoute, eventOverviewRoute, objectsOverviewRoute],
  icon: OcelotIcon,
});
