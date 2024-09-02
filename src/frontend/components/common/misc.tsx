import { useId } from "react"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
import Skeleton from "react-loading-skeleton"


export const WithTooltip: React.FC<React.PropsWithChildren<{
  tooltip?: string
}>> = ({ tooltip, children }) => {
  const id = useId()
  if (!children)
    return false
  if (!tooltip) {
    return children
  }
  return (
    <OverlayTrigger overlay={<Tooltip id={id}>{tooltip}</Tooltip>}>
      <div>
        {children}
      </div>
    </OverlayTrigger>
  )
}

export const SelectSkeleton: React.FC<{}> = () => {
  return <Skeleton height={38} />
}
