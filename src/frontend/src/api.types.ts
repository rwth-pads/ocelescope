import _ from "lodash";
import { ApiError, TaskResponse, TaskState, TaskStatusResponse } from "./api/generated";
import { AppStateExport } from "./app-state.types";
import { Api } from "./openapi";

// generic param F: generated api function

export type MethodsOf<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]
export type MethodTypes<T> = T extends { [K in keyof T]: infer R } ? R : never
export type InstanceTypeMethodsUnion<T> = MethodTypes<{
  [K in MethodsOf<T>]: T[K]
}>
// export type ApiF = (...args: any) => CancelablePromise<any>
// export type ApiF = InstanceTypeMethodsUnion<typeof Api>
export type ApiF =
  // typeof Api.climatiqUnitsClimatiqUnitsGet
  | typeof Api.computeEmissionsComputeEmissionsPost
  | typeof Api.objectAllocationObjectAllocationPost
  // | typeof Api.defaultOcelsOcelDefaultGet
  | typeof Api.discoverDfgDfgPost
  | typeof Api.discoverEfgEfgPost
  // | typeof Api.downloadOcelDownloadGet
  | typeof Api.importDefaultOcelImportDefaultGet
  | typeof Api.importOcelImportPost
  // | typeof Api.intervalTransformationIntervalTransformationPost
  | typeof Api.loadOcelLoadGet
  | typeof Api.ocpnOcpnPost
  | typeof Api.sampleEventsSampleEventsGet
  | typeof Api.sampleObjectsSampleObjectsGet
  | typeof Api.taskStatusTaskStatusGet
  | typeof Api.updateStateUpdatePut

export type ApiRequestType<F extends ApiF> = Parameters<F>
export type ApiResponseType<F extends ApiF> = Awaited<ReturnType<F>>

// F -> task result type
// python generics are not translated correctly. Thus we can't access the type of res.task.result
// Need to access result type by the union member directly returning the task result when cached / fast.
export type TaskResultType<F extends ApiF> = Exclude<ApiResponseType<F>, TaskStatusResponse>
// export type TaskResultType<F extends ApiF> = ResponseType<F>["task"]["result"]

export type ApiExec<F extends ApiF> = () => Promise<ApiResponseType<F>>
export type ApiWrapper<F extends ApiF> = (exec: ApiExec<F>, options: ApiRequestOptions<F>) => Promise<ApiResponseType<F> | false>
export type GlobalApiWrapper = ApiWrapper<ApiF>
// export type LaunchTaskResponse<F extends ApiF> = ResponseType | ApiTaskResponse<TRes>
// export type TaskResult<F extends ApiF> = Exclude<LaunchTaskResponse<TRes>, ApiTaskResponse<any>>
// export type ApiExec<TRes extends object> = () => Promise<TRes>
// export type ApiWrapper<TRes extends object> = (exec: ApiExec<TRes>, options: ApiRequestOptions<TRes>) => Promise<TRes | false>
// export type LaunchTaskResponse<TRes extends Object> = TRes | ApiTaskResponse<TRes>
// export type TaskResult<TRes extends object> = Exclude<LaunchTaskResponse<TRes>, ApiTaskResponse<any>>

export type ApiRequestOptions<F extends ApiF> = {
  skipMutex?: boolean
  session?: string
  loadingText?: string
  successTitle?: string
  ignoreOcel?: boolean
  setTask?: (task: BackendTask<F>) => void
  onCompletion?: (data: TaskResultType<F>) => void
  onApiError?: Record<number, (err: ApiError) => void>  // http status code -> error handler
  importedAppState?: AppStateExport

  isComputeEmissions?: boolean
  isImportOrLoad?: boolean
  updateAppState?: boolean
}

export type ApiErrorResponse = {
  detail: string
}

export const taskPollDuration = 1000

export type BackendTask<F extends ApiF> = {
  id: string
  route: string
  taskState: TaskState
  // result?: Omit<ApiResponse<F>, "task">
  result?: TaskResultType<F>
  msg: string
  percentage?: number
  // TODO add start timestamp

  // pollIntervalHandle?: NodeJS.Timeout
  lastPercentage?: number
  unchangedPercentageCounter?: number  // number of consecutive polls the percentage remained unchanged
}
// export type BackendTask<T> = {
//   id: string
//   route: string
//   taskState: TaskState
//   // result?: Omit<ApiResponse<T>, "task">
//   result?: ApiResponse<T>
//   msg: string
//   percentage?: number
//   // TODO add start timestamp

//   // pollIntervalHandle?: NodeJS.Timeout
//   lastPercentage?: number
//   unchangedPercentageCounter?: number  // number of consecutive polls the percentage remained unchanged
// }
// export type ApiTaskResponse<T> = ApiResponse<T> & {
//   task: BackendTask<T>
// }

export function findRunningTask(tasks: BackendTask<ApiF>[], filters: Partial<BackendTask<ApiF>>) {
  return tasks.findLast(task => {
    if (!(task.taskState != "SUCCESS" && task.taskState != "FAILURE")) return false
    return Object.entries(filters).every(([k, v]) => _.get(task, k) == v)
  })
}

export function findTask(tasks: BackendTask<ApiF>[], filters: Partial<BackendTask<ApiF>>) {
  return tasks.findLast(task => {
    return Object.entries(filters).every(([k, v]) => _.get(task, k) == v)
  })
}

export type TypedTaskStatusResponse<TRes extends object> = Omit<TaskStatusResponse, "task"> & {
  task: Omit<TaskResponse, "result"> & {
    result?: TRes | null
  }
}


export function scheduleTaskPoll<F extends ApiF>(
  apiWrapper: ApiWrapper<typeof Api.taskStatusTaskStatusGet>,
  tasks: BackendTask<ApiF>[],
  task: BackendTask<F>,
  session: string,
  options: ApiRequestOptions<F>
) {
  const {
    setTask,
    onCompletion
  } = options

  setTimeout(async () => {

    const lastPercentage = task.percentage ?? 0
    const lastUnchangedPercentageCounter = task.unchangedPercentageCounter ?? 0

    const data = await apiWrapper(async () => {
      return Api.taskStatusTaskStatusGet({
        oceanSessionId: session,
        taskId: task.id,
      })
    }, {  // [task-status]
      skipMutex: true,
      setTask: setTask as unknown as ApiRequestOptions<typeof Api.taskStatusTaskStatusGet>["setTask"],
      onCompletion: onCompletion
    })
    if (!data) return
    task = data.task as unknown as BackendTask<F>
    if (!task) return

    // TODO !! task obj has been copied, find another way to save these data
    const taskRef = findTask(tasks, { id: task.id })
    if (taskRef) {
      if (lastPercentage != task.percentage) {
        taskRef.lastPercentage = lastPercentage
      } else {
        taskRef.unchangedPercentageCounter = lastUnchangedPercentageCounter + 1
      }
    }

  }, taskPollDuration)

}
