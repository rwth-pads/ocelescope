/* eslint-disable react-hooks/exhaustive-deps */
import { ToastProps } from '@/components/common/Toast';
import { EventIcon, UnspecifiedObjectIcon } from "@/components/misc";
import { ApiWrapper, BackendTask } from "@/src/api.types";
import { useOceanStore } from "@/src/zustand";
import Button from "react-bootstrap/Button";
import { FaCircleInfo, FaCloud } from "react-icons/fa6";
import Qty from '../Quantity';


const OcelOverview: React.FC<{
  handleSampleEvents?: () => Promise<any>
  handleSampleObjects?: () => Promise<any>
  apiWrapper: ApiWrapper<any>
}> = ({
  handleSampleEvents, handleSampleObjects,
  apiWrapper,
}) => {
  const ocel = useOceanStore.use.ocel()
  const emissions = useOceanStore.use.emissions()
  const { setIsEmissionAttributeSelectionOpen } = useOceanStore.useState.isEmissionAttributeSelectionOpen()

  return (<>
    {!!ocel && (<>
      <div className="d-flex flex-column gap-1">

        <div className="d-flex align-items-center gap-2">
          <FaCircleInfo className="text-secondary" />
          <span>File name: <code>{ocel.meta.fileName}</code></span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <EventIcon className="text-secondary" />
          <span className="me-2">{ocel.numEvents} Events of {ocel.activities.length} activities</span>
          {!!handleSampleEvents && (<Button size="sm" onClick={() => handleSampleEvents()} variant="light">Show sample</Button>)}
        </div>

        <div className="d-flex align-items-center gap-2">
          <UnspecifiedObjectIcon className="text-secondary" />
          <span className="me-2">{ocel.numObjects} Objects of {ocel.objectTypes.length} types</span>
          {!!handleSampleObjects && (<Button size="sm" onClick={() => handleSampleObjects()} variant="light">Show sample</Button>)}
        </div>

        <div className="d-flex align-items-center gap-2">
          <FaCloud className={!!emissions ? "text-success" : "text-secondary"} />
          <span className="me-2">
            {!!emissions && (<>
              Total emissions: <Qty value={emissions.overallEmissions} unit={emissions.unit} />
            </>)}
            {!emissions && (<>
              No emission data
            </>)}
          </span>
          {!emissions && (<Button size="sm" onClick={() => setIsEmissionAttributeSelectionOpen(true)} variant="light">Select attributes</Button>)}
        </div>
      </div>

    </>)}
  </>)
}

export default OcelOverview
