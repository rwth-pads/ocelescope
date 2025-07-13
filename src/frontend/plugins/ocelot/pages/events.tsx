import EntityPage from "../components/EntityPage";
import { defineRoute } from "@/lib/plugins";

const EventPage = () => <EntityPage type="events" />;

export default defineRoute({
  component: EventPage,
  label: "Events",
  name: "events",
});
