/**
 * Generated by orval v7.9.0 🍺
 * Do not edit manually.
 * OCEAn
 * OpenAPI spec version: 0.9.12
 */
import type { TaskState } from './taskState';
import type { TaskResponseObjectCentricPetriNetTaskId } from './taskResponseObjectCentricPetriNetTaskId';
import type { TaskResponseObjectCentricPetriNetResult } from './taskResponseObjectCentricPetriNetResult';
import type { TaskResponseObjectCentricPetriNetError } from './taskResponseObjectCentricPetriNetError';

export interface TaskResponseObjectCentricPetriNet {
  status: TaskState;
  taskId?: TaskResponseObjectCentricPetriNetTaskId;
  result?: TaskResponseObjectCentricPetriNetResult;
  error?: TaskResponseObjectCentricPetriNetError;
}
