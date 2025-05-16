import { useEventInfo } from "@/api/fastapi/ocelot/ocelot";
import { RouteDefinition } from "@/plugins/types";
import { Stack } from "react-bootstrap";

const EventTypes = () => {
  const { data: eventTypes } = useEventInfo();

  return <Stack>{eventTypes}</Stack>;
};

export default EventTypes;

export const config: RouteDefinition = { name: "Example Page" };
