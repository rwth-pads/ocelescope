import { definePlugin } from "@/lib/plugins";
import mine from "./pages/mine";

export default definePlugin({
  authors: [{ name: "Liss, Lukas" }, { name: "Öztürk, Görkem-Emre" }],
  description:
    "The TOTeM Discovery plugin extracts Temporal Object Type Models (TOTeM) from object-centric event logs, enabling a nuanced analysis of temporal and cardinal relationships between object types.",
  label: "TOTeM",
  name: "totem",
  routes: [mine],
});
