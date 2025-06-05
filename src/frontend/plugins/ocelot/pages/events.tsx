import { RouteDefinition } from "@/plugins/types";
import EntityPage from "../components/EntityPage";

const EventPage = () => <EntityPage type="events" />;

export default EventPage;

export const config: RouteDefinition = { name: "Events" };
