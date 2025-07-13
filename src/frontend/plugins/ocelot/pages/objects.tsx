import EntityPage from "../components/EntityPage";
import { defineRoute } from "@/lib/plugins";

const ObjectPage = () => <EntityPage type="objects" />;

export default defineRoute({
  component: ObjectPage,
  label: "Objects",
  name: "objects",
});
