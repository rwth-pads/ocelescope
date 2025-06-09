
import { useTotem } from "@/api/fastapi/totem/totem";
import { RouteDefinition } from "@/plugins/types";
import { useMemo } from "react";

const MinePage = () => {
  const { data: totem } = useTotem()

  const a = useMemo(
    () => {
      if (!totem) {
        return []
      }

      return Array.from(new Set(totem.relations.filter((relation) => !Object.values(relation).some((value) => value.includes("ERROR")))))

    }, [totem]
  )

  console.log(JSON.stringify(a));

  return <>
  </>;
}
export default MinePage;

export const config: RouteDefinition = { name: "Mine" };
