import { definePlugin } from "@/lib/plugins";
import ocdfgRoute from "./pages/ocdfg";
import ocpnRoute from "./pages/petrinet";

export default definePlugin({
  name: "berti",
  label: "Berti Discovery",
  authors: [{ name: "Berti, Alessandro" }, { name: "Öztürk, Görkem-Emre" }],
  description:
    "Berti Discovery is a plugin for discovering process models from object-centric event logs using algorithms provided by the PM4Py library.",
  routes: [ocdfgRoute, ocpnRoute],
});
