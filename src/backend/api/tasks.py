from __future__ import annotations

from api.model.response import BaseResponse
from api.session import Session
from api.task_api import MainTask, task


class ComputeEmissionsResponse(BaseResponse):
    # emissions: ProcessEmissions
    pass


@task(route="compute-emissions")
def compute_emissions_task(task: MainTask, session: Session):
    ocel = session.ocel
    em = session.emission_model

    # Compute emissions
    emissions = em.calculate_emissions(task=task)

    # Serialize
    return ComputeEmissionsResponse(
        **task.respond_with_result(
            msg=f"Emissions have been calculated based on the rules passed.",
            emissions=emissions,
        )
    )
