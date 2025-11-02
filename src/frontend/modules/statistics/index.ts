import { defineModule } from "@/lib/modules";
import { ChartColumnDecreasingIcon } from "lucide-react";
import StatisticsPage from "./pages";

export default defineModule({
  name: "statistics",
  description: "A tool to get statistics about the current ocel",
  label: "Statistics",
  authors: [{ name: "Öztürk, Görkem-Emre" }],
  routes: [StatisticsPage],
  icon: ChartColumnDecreasingIcon,
});
