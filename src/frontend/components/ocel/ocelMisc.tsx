import Qty from "@/components/Quantity"
import { OcelEvent, OcelObject } from "@/src/api/generated"
import { useAttributeUnit } from "@/src/app-state.types"
import { isEventAttribute, isObjectAttribute } from "@/src/ocel.types"
import { useOceanStore } from "@/src/zustand"


export const AttrValue: React.FC<{
  name: string
  event?: OcelEvent
  object?: OcelObject
}> = ({ name, event, object }) => {
  const ocel = useOceanStore.use.ocel()
  const attr = ocel?.attributes.find(attr => {
    if (attr.name != name) return false
    if (event && isEventAttribute(attr) && attr.activity == event.activity) return true
    if (object && isObjectAttribute(attr) && attr.objectType == object.type) return true
    return false
  })
  const unit = useAttributeUnit(attr)
  const values = event?.attr ?? object?.attr

  if (!ocel || !values || !attr || !(name in values)) return <span className="text-secondary">-</span>
  if (attr.numeric) {
    return <Qty value={values[name] as number} unit={unit ?? undefined} />
  }
  return values[name] as JSX.Element

}
