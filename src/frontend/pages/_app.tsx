/* eslint-disable react-hooks/exhaustive-deps */

import { AppProps } from 'next/app';
// import { appWithTranslation } from 'next-i18next';
import ConfirmationModalProvider from '@/components/common/Confirmation';
import { ToastProps, useToast } from '@/components/common/Toast';
import Layout, { useLoadingText } from '@/components/layout/Layout';
import "@/global.css";
import { ApiErrorResponse, ApiExec, ApiF, ApiRequestOptions, ApiResponseType, ApiWrapper, BackendTask, TaskResultType, scheduleTaskPoll } from '@/src/api.types';
import { ApiError, AppState_Input } from '@/src/api/generated';
import { AppStateExport, applyImportedAppState, exportAppState } from '@/src/app-state.types';
import { loadClimatiqUnitTypes } from '@/src/climatiq.types';
import { updateObjectTypeColors } from '@/src/object-type-colors';
import { OCEL } from '@/src/ocel.types';
import { Api } from '@/src/openapi';
import { getLocalStorage, removeLocalStorage, setLocalStorage, useDarkMode, useInitEffect, useIsClient } from '@/src/util';
import { selectAppState, useOceanStore } from '@/src/zustand';
import { Mutex } from 'async-mutex';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import _ from 'lodash';

type InitialPageProps = {
  [x: string]: any;
  // props provided by Page/getServerSideProps()
  // ...
}

export type PageProps = InitialPageProps & {
  isClient: boolean;

  // UI
  darkMode: boolean;
  toggleDarkMode: () => void;

  // API interaction
  tasks: BackendTask<any>[]
  apiWrapper: ApiWrapper<any>;

}


const OceanApp: React.FC<AppProps<InitialPageProps>> = ({ Component, pageProps }) => {
  const pageName = Component.displayName || Component.name || 'UnknownComponent'
  const isClient = useIsClient()

  const [darkMode, toggleDarkMode] = useDarkMode()
  const { errorMessage, setErrorMessage } = useOceanStore.useState.errorMessage()
  const hasError = useMemo(() => !!errorMessage, [errorMessage])

  const addToast = useToast()
  const setLoadingText = useLoadingText()

  useEffect(() => {
    if (hasError) {
      setLoadingText(null)
    }
  }, [hasError])

  // App state
  const { tasks, setTasks } = useOceanStore.useState.tasks()

  // Extract global state (zustand)
  const { session, setSession } = useOceanStore.useState.session()
  const { ocel, setOcel } = useOceanStore.useState.ocel()
  const { apiState, setApiState } = useOceanStore.useState.apiState()

  const { ocpn, setOcpn } = useOceanStore.useState.ocpn()
  const { emissions, setEmissions } = useOceanStore.useState.emissions()
  const { objectEmissionResults, setObjectEmissionResults } = useOceanStore.useState.objectEmissionResults()

  // AppState
  // const \[(.*), (.*)\] = useState<(.*)>\(.*\)
  // to: const { $1, $2 } = useOceanStore.useState.$1()

  const { objectTypeColors, setObjectTypeColors } = useOceanStore.useState.objectTypeColors()
  const { objectTypeClasses, setObjectTypeClasses } = useOceanStore.useState.objectTypeClasses()
  const { attributeUnits, setAttributeUnits } = useOceanStore.useState.attributeUnits()
  const { emissionAttributes, setEmissionAttributes } = useOceanStore.useState.emissionAttributes()
  const { emissionRules, setEmissionRules } = useOceanStore.useState.emissionRules()
  const { objectAllocationConfig, setObjectAllocationConfig } = useOceanStore.useState.objectAllocationConfig()

  const appState = useOceanStore(selectAppState)

  // Init object type colors
  useEffect(() => {
    if (ocel && _.isEmpty(objectTypeColors)) {
      updateObjectTypeColors(ocel.objectTypes, setObjectTypeColors)
    }
  }, [ocel, objectTypeColors])

  /**
   * TODO climatiq units are unused and currently are fetched from a cached .json file.
   * If keeping this, only when changing to actually fetching the current unit list from the climatiq API (https://api.climatiq.io/data/v1/unit-types)
   */
  const { climatiqUnits, setClimatiqUnits } = useOceanStore.useState.climatiqUnits()

  const [preventUpdates, setPreventUpdates] = useState<number>(1)

  const apiMutex = new Mutex()

  useInitEffect(async () => {
    const session = getLocalStorage<string | null>("session", null)
    if (session) {
      try {
        const res = await apiWrapper(() => Api.loadOcelLoadGet({
          oceanSessionId: session
        }), {
          loadingText: "Loading Event log",
          successTitle: "OCEL loaded successfully",
          isImportOrLoad: true,
          onApiError: {
            401: err => setErrorMessage(`Session expired`)
          }
        })
      } catch (e) {
        console.warn(e)
      }
    }

    // fetch climatiq units
    try {
      const unitTypes = await loadClimatiqUnitTypes()
      if (!unitTypes) {
        setErrorMessage("Lost connection to the server. Try to restart the session.")
      } else {
        setClimatiqUnits(unitTypes)
      }
    } catch (e) {
      setErrorMessage("Lost connection to the server. Try to restart the session.")
    }
  }, [])

  // const apiWrapper = async <TRes extends ApiResponse<T>, T extends object>(
  const apiWrapper = async <F extends ApiF,>(
    exec: ApiExec<F>,
    options: ApiRequestOptions<F>
  ) => {
    const {
      skipMutex = false,
      loadingText,
      onApiError,
    } = options

    const callback = async () => {
      if (loadingText) {
        setLoadingText(loadingText)
      }

      // remove old error message (?)
      setErrorMessage(null)

      try {
        // const res = await exec() as unknown as ApiResponse<TRes>
        const res: ApiResponseType<F> = await exec()
        const res1: ApiResponseType<F> = await processApiResponse(res, options)
        return res1
      } catch (err) {
        setLoadingText(null)

        // Catch API error by custom function without showing error
        if (onApiError && err instanceof ApiError) {
          if (err.status in onApiError) {
            onApiError[err.status](err)
            return false
          }
        }

        // On Unauthorized error, reset session
        if (err instanceof ApiError && err.status == 401) {
          removeLocalStorage("session")
          window.location.href = "/"
        }

        // TODO use nextjs Error Boundary instead!
        // TODO better way to get our own error model to the frontend?
        if (err instanceof ApiError) {
          const body = err.body as ApiErrorResponse
          console.error("ApiError", {
            request: err.request,
            url: err.url,
            status: err.status,
            statusText: err.statusText,
            name: err.name,
            cause: err.cause,
            body: body,
          })
          setErrorMessage(`${err.message}: ${body.detail}`)
        } else {
          console.error("error", JSON.stringify(err))
          setErrorMessage("Unknown Error on API request")
          throw err
        }
        return false
      }


    }
    if (skipMutex) {
      return await callback()
    }
    return await apiMutex.runExclusive(callback)

  }

  // const processTaskResponse = async <TRes extends object,>(
  const processTaskResponse = async <F extends ApiF,>(
    task: BackendTask<F>,
    responseData: ApiResponseType<F>,
    options: ApiRequestOptions<F>
  ) => {
    const {
      setTask,
      onCompletion
    } = options

    setTasks(tasks => [...tasks.filter(t => t.id != task.id), task])
    if (setTask) {
      setTask(task)
    }
    const newSession = session ?? responseData.session
    if (!newSession) {
      throw Error("No session found")
    }

    switch (task.taskState) {
      case "PENDING":
      case "STARTED":
      case "PROGRESS":
      case "RETRY":
        // Task is not finished. Schedule task polling

        // TODO make task requests async, waiting until task finished?
        // Otherwise always use onCompletion.

        scheduleTaskPoll<F>(
          apiWrapper<typeof Api.taskStatusTaskStatusGet> as unknown as ApiWrapper<typeof Api.taskStatusTaskStatusGet>,
          tasks,
          task,
          newSession,
          options
        )
        return {
          responseData,
          finish: true
        }

      case "SUCCESS":
        if (task.result !== undefined) {
          // TASK HAS FINISHED
          if (onCompletion) {
            onCompletion(task.result)
          }
          // Backwards compatibility:
          // Proceed like before introducing tasks
          // Remove task from responseData, move task result two levels up in responseData
          // TODO use generated types
          return {
            responseData: {
              ...responseData,
              task: undefined,
              ...task.result
            },
            finish: false
          }
        } else {
          // Nothing more to do when result is empty (should not happen)
          console.warn("Task result is empty")
          return {
            responseData,
            finish: true
          }
        }

      case "FAILURE":
        setErrorMessage(task.msg ?? "Task execution failed")
        console.log(`TODO Call onFailure if defined`)
        // if (onFailure && ...) {
        //   onFailure(...)
        // }
        return {
          responseData: false,
          finish: true
        }

      default:
        console.error(`Unknown task status '${task.taskState}'`)

    }
    return {
      responseData,
      finish: false
    }
  }

  // const processApiResponse = async <TRes extends ApiResponse<T>, T extends object>(
  const processApiResponse = async <F extends ApiF,>(
    responseData: ApiResponseType<F>,
    // responseData: Awaited<ReturnType<ApiExec<TRes>>>,
    options: ApiRequestOptions<F>
  ) => {
    const {
      successTitle,
      ignoreOcel = false,
      onCompletion,
      updateAppState = false,
      isImportOrLoad = false,
      isComputeEmissions = false
    } = options
    const isTask = "task" in responseData && !!responseData.task

    setLoadingText(null)
    if (isImportOrLoad && responseData.session) {
      setSession(responseData.session)
      setLocalStorage("session", responseData.session)
    }
    console.log("setApiState", responseData.state)
    setApiState(responseData.state)

    // Process the task information
    if (isTask && "task" in responseData) {
      const task = responseData.task as BackendTask<F>
      // Applicable if ...
      // - the route started a task in the backend
      // - the route is "task-status", checking on a task started before
      setLoadingText(null)  // Tasks should not cause loading screen overlay

      // Extract and save task
      const { finish, responseData: newResponseData } = await processTaskResponse(task, responseData, options)
      responseData = newResponseData as unknown as ApiResponseType<F>
      // When task is now finished, responseData is actually of type TaskResultType<F>.
      // const { finish, responseData: newResponseData } = await processTaskResponse(responseData.task as BackendTask<TRes>, responseData, options)
      // responseData = newResponseData as unknown as ApiResponse<TRes>
      if (finish) {
        return responseData
      }
    }

    // Process OCEL
    if (!ignoreOcel && "ocel" in responseData) {
      setOcel(responseData.ocel as OCEL)  // TODO MA-171 use generated type
    }

    // Process result-like response contents
    if ("ocpn" in responseData) {
      setOcpn(responseData.ocpn)
    }
    if ("emissions" in responseData && !!responseData.emissions) {
      setEmissions({
        ...responseData.emissions,
        apiState: isComputeEmissions ? responseData.state : (emissions?.apiState ?? "old")
      })
    }
    if ("objectEmissions" in responseData) {
      if (!("objectAllocationConfig" in responseData))
        throw Error("Response contains object emissions, but no allocation config")
      setObjectEmissionResults({
        objectEmissions: responseData.objectEmissions,
        objectAllocationConfig: responseData.objectAllocationConfig
      })
    }

    // Apply appState (import/load)
    if (isImportOrLoad) {
      if (!responseData.session || !("ocel" in responseData) || !responseData.ocel) {
        throw Error("Cannot import app state - session or OCEL undefined in response")
      }
      const appState = responseData.appState ?? options.importedAppState
      // setPreventUpdates(1)
      await applyImportedAppState(
        (appState ?? {}) as AppStateExport, responseData.session, responseData.ocel as OCEL, apiWrapper
      )

      setTimeout(() => {
        // preventUpdates now gets initialized with 1/true.
        // Only after import/load + applyImportedAppState, enable auto updates.
        // This now automatically triggers updateAppState()
        // setPreventUpdates(i => Math.max(0, i - 1))  // initially 1 on page load
        setPreventUpdates(0)  // initially 1 on page load
      }, 100)
    }

    // Apply appState (other requests)
    if (updateAppState) {
      if (!session || !ocel) {
        throw Error("Cannot import app state - session or OCEL undefined")
      }
      const appState = responseData.appState ?? options.importedAppState
      // setPreventUpdates(1)
      await applyImportedAppState(
        (appState ?? {}) as AppStateExport, session, ocel, apiWrapper
      )
      // setTimeout(() => {
      //   setPreventUpdates(i => Math.max(0, i - 1))  // initially 1 on page load
      // }, 100)
    }

    // Callbacks
    if (!isTask) {
      if (onCompletion) {
        const taskResult = responseData as TaskResultType<F>
        onCompletion(taskResult)
      }
      // if (onFailure) {
      //   onFailure(...)
      // }
    }

    // console.log("setApiState", responseData.state)
    // setApiState(responseData.state)
    // setPreventUpdates(i => i - 1)

    if (successTitle && responseData.msg) {
      addToast({ title: successTitle, msg: responseData.msg })
    }
    return responseData
  }

  useEffect(() => {
    console.log("session", session)
  }, [session])

  // const appState = useOceanStore(selectAppState)
  // const appStateExport = useOceanStore(selectExportedAppState)

  useEffect(() => {
    // Send appState to server (to save session)
    if (session && !preventUpdates) {
      console.log("appState changed!", appState)
      const appStateExport = exportAppState(appState)

      apiWrapper(() => Api.updateStateUpdatePut({
        oceanSessionId: session,
        requestBody: {
          appState: appStateExport as unknown as AppState_Input  // TODO fix generated type
        }
      }), {
        ignoreOcel: true  // prevent triggering updateAppState after receiving response
      })
    }
  // }, [appStateExport])
  // }, [appState])
  }, [objectTypeColors, objectTypeClasses, attributeUnits, emissionAttributes, emissionRules, objectAllocationConfig])

  return (<>
    <ConfirmationModalProvider>
      <Layout
        pageName={pageName}
        darkMode={darkMode}
      >
        <Component
          isClient={isClient}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          apiWrapper={apiWrapper}
          {...pageProps}
        />
      </Layout>
    </ConfirmationModalProvider>
  </>)

}

export default OceanApp;
