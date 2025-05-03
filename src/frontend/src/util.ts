/* eslint-disable react-hooks/exhaustive-deps */
// import { Mutex } from "async-mutex";
import _ from "lodash";
import path from "path";
import {
  DependencyList,
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function useComputedStyle<T extends Element>(
  key: string,
  ref: RefObject<T>,
) {
  const value = useMemo(() => {
    if (!ref?.current) {
      return null;
    }
    const styles = window.getComputedStyle(ref.current, null);
    return styles.getPropertyValue(key);
  }, []);

  return value;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Refreshable<S> =
  | (S & {
      refreshCounter?: number;
    })
  | undefined;
/**
 *
 * @param setState the state's set function
 */
export function refreshState<S>(
  setState: Dispatch<SetStateAction<Refreshable<S>>>,
) {
  setState((prev) => {
    if (!prev) {
      return prev;
    }
    return {
      ...prev,
      refreshCounter: (prev.refreshCounter ?? 0) + 1,
    };
  });
}

function asyncWaitForNewState(
  getCurrentRefreshCounter: () => number,
  action: () => void,
): Promise<void> {
  const intervalDuration = 100;
  const timeoutDuration = 2000;

  return new Promise<void>((resolve, reject) => {
    const prevRefreshCounter = getCurrentRefreshCounter();
    // Trigger increment of refresh counter
    action();

    const timeoutHandle = setTimeout(() => {
      clearInterval(intervalHandle);
      reject();
    }, timeoutDuration);

    // Wait for refresh counter increment to resolve promise
    const intervalHandle = setInterval(() => {
      const refreshCounter = getCurrentRefreshCounter();
      // console.log(`${refreshCounter} > ${prevRefreshCounter}?`)
      if (refreshCounter > prevRefreshCounter) {
        // console.log("Refresh finished.")
        clearInterval(intervalHandle);
        clearTimeout(timeoutHandle);
        resolve();
      }
    }, intervalDuration);
  });
}

/**
 * @param initialValue
 * @returns
 */
export function useRefreshableState<S extends Object>(
  initialValue: S | undefined = undefined,
): [
  Refreshable<S>,
  (value: SetStateAction<S>) => Promise<void>,
  () => Promise<void>,
] {
  const [state, setState] = useState<Refreshable<S>>(
    !!initialValue
      ? {
          ...initialValue,
          refreshCounter: 0,
        }
      : initialValue,
  );

  // ref is used to access refreshCounter from within setInterval
  const countRef = useRef(state?.refreshCounter ?? 0);
  useEffect(() => {
    // console.log(`New countRef: ${state?.refreshCounter ?? 0}`)
    countRef.current = state?.refreshCounter ?? 0;
  }, [state]);

  const setStateWrapper = async (setStateArg: S | ((prevState: S) => S)) => {
    // console.log("setStateWrapper()")
    await asyncWaitForNewState(
      () => countRef.current,
      () => {
        setState((prev) => {
          const newState: Refreshable<S> =
            typeof setStateArg === "function"
              ? (setStateArg as (prevState: S | undefined) => S)(prev)
              : setStateArg;
          if (newState !== undefined) {
            newState.refreshCounter = (prev?.refreshCounter ?? 0) + 1;
          }
          return newState;
        });
      },
    );
  };
  const refreshState = async () => {
    await setStateWrapper((prev) => prev);
  };

  return [state, setStateWrapper, refreshState];
}

export function objectKeysToCamelCase(obj: any): any {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [_.camelCase(k), v]),
  );
}

export function objectKeysToSnakeCase(obj: any): any {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [_.snakeCase(k), v]),
  );
}

export function removeEmptyProperties(
  obj: any,
  options: {
    removeZero?: boolean;
  } = {},
): any {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) =>
      options.removeZero ? !!v : v !== undefined && v !== null,
    ),
  );
}

export function objectToUrl(obj: {
  [k: string]: string | number | boolean | null | undefined;
}): string {
  const obj1 = removeEmptyProperties(obj) as {
    [k: string]: string | number | boolean;
  };
  return Object.entries(obj1)
    .map(
      ([key, value]) =>
        encodeURIComponent(key) + "=" + encodeURIComponent(value),
    )
    .join("&");
}

export const capitalize = <T extends string>(s: T) =>
  (s[0].toUpperCase() + s.slice(1)) as Capitalize<typeof s>;

export function randomChoice<T>(arr: Array<T>): T | undefined {
  if (!arr.length) {
    return undefined;
  }
  return arr[Math.floor(arr.length * Math.random())];
}

/**
 * localStorage.getItem() wrapper, using JSON encoding
 * @param key
 * @param defaultValue
 * @returns
 */
export function getLocalStorage<T>(
  key: string,
  defaultValue: T | null = null,
): T | null {
  const value = localStorage.getItem(key);
  console.log(`get localStorage[${key}]: ${value ?? "not found"}`);
  if (value === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * localStorage.setItem() wrapper, using JSON encoding
 * @param key
 * @param value
 */
export function setLocalStorage<T>(key: string, value: T) {
  console.log(`set localStorage[${key}]:= ${JSON.stringify(value)}`);
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalStorage(key: string) {
  console.log(`remove localStorage[${key}]`);
  localStorage.removeItem(key);
}

/**
 * A custom useEffect hook that only triggers on updates, not on initial mount
 * From https://stackoverflow.com/a/57632587
 * @param {() => any} effect
 * @param {any[]} dependencies
 */
export function useUpdateEffect(
  effect: () => any,
  dependencies: DependencyList | undefined = undefined,
) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      return effect();
    }
  }, dependencies);
}

/**
 * A custom useEffect hook that only triggers on first update of a state (or multiple states).
 * The callback may be async, therefore, the return value is NOT used as unmounting callback.
 * @param {() => Promise<void> | void} effect
 * @param {any[]} dependencies
 */
export function useInitEffect(
  effect: () => any,
  dependencies: DependencyList | undefined = undefined,
) {
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      effect();
    }
  }, dependencies);
}

export function useDarkMode(
  initialValue: boolean = false,
): [boolean, () => void] {
  const [darkMode, setDarkMode] = useState(initialValue);

  // manually toggle the dark mode (called by a button), saving an individual preference
  const toggleDarkMode = () => {
    const newState = !darkMode;
    setDarkMode(newState);
    setLocalStorage("darkMode", newState);
  };

  // Update the bootstrap theme when state changes
  useUpdateEffect(() => {
    document.documentElement.setAttribute(
      "data-bs-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  // Get initial value
  useEffect(() => {
    // Get individual preference from localStorage
    const storedDarkMode = getLocalStorage<boolean | null>("darkMode", null);
    if (storedDarkMode !== null) {
      setDarkMode(storedDarkMode);
    } else {
      // If there's no individual preference for this page, use system preference and listen to changes
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (event) => {
          // console.log(`System preference changed: ${event.matches ? "dark" : "light"}`);
          setDarkMode(event.matches);
          localStorage.removeItem("darkMode");
        });
    }
  }, []);

  return [darkMode, toggleDarkMode];
}

export async function readReadme(
  locale: string,
  readFile: (file: string) => Promise<string>,
) {
  const file = path.join(
    process.cwd(),
    "public",
    `game-info-${(locale).toLowerCase()}.md`,
  );
  // const file = path.join(process.cwd(), "public", `game-info-${(locale ?? defaultLanguage).toLowerCase()}.md`)
  return await readFile(file);
}

export function combineClassNames(...classNames: (string | undefined)[]) {
  return classNames.filter((x) => x !== undefined).join(" ");
}

export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState<boolean>(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
}

// from https://blog.logrocket.com/accessing-previous-props-state-react-hooks/#custom-hook-with-useprevious-hook
export function usePrevious<T>(value: T | undefined) {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value; // assign the value of ref to the argument
  }, [value]); // this code will run when the value of 'value' changes
  return ref.current; // in the end, return the current ref value.
}

export function removeNull(obj: object | undefined): object | undefined {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj;
  if (typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== null)
      .map(([k, v]) => [k, removeNull(v)]),
  );
}
