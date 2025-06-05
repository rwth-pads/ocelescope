import { RouteDefinition } from "@/plugins/types";
import EntityPage from "../components/EntityPage";

const ObjectPage = () => <EntityPage type="objects" />;

export default ObjectPage;

export const config: RouteDefinition = { name: "Objects" };
