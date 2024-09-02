import { StoreApi, UseBoundStore } from "zustand";
import { Dispatch, SetStateAction, useState } from "react";
import _ from "lodash";


type CapitalizeStr<S extends string> = S extends `${infer First}${infer Rest}` ? `${Uppercase<First>}${Rest}` : S
type NonUndefined<T> = T extends undefined ? never : T
export type DispatchStateSetters<T> = {
  [K in keyof T as `set${CapitalizeStr<string & K>}`]: Dispatch<T[K]>
}
export type DispatchSetStateActionStateSetters<T> = {
  [K in keyof T as `set${CapitalizeStr<string & K>}`]: Dispatch<SetStateAction<T[K]>>
}
// type DispatchSetStateActionStateSetter<K, T> = DispatchSetStateActionStateSetters<{ [P in K]: T }>
type StoreSetter<S> = (partial: (state: S) => any) => void

export function valueSetter<T, Store>(k: string, set: StoreSetter<Store>) {
  return (v: T) => set(state => Object.fromEntries([[k, v]]))
}
export function updaterSetter<T, Store>(k: string, set: StoreSetter<Store>) {
  return (updater: (prev: T) => T) => set(state => Object.fromEntries([[k, updater(_.get(state, k) as T)]]))
}
export function valueOrUpdaterSetter<T, Store>(k: string, set: StoreSetter<Store>) {
  return (valueOrUpdater: SetStateAction<T>) => {
    if (typeof valueOrUpdater === 'function') {
      return set(state => Object.fromEntries([[k, (valueOrUpdater as (prev: T) => T)(_.get(state, k) as T)]]))
    }
    return set(state => Object.fromEntries([[k, valueOrUpdater]]))
  }
}

function setterName<State extends object, Action extends object>(k: keyof State & string) {
  return "set" + k.charAt(0).toUpperCase() + k.substring(1) as keyof Action
}

export function stateAndSetter<T, State extends object, Action extends object>(set: StoreSetter<State & Action>, k: keyof State & string, initialState?: T) {
  return Object.fromEntries([
    [k, initialState],
    [setterName(k), valueOrUpdaterSetter(k, set)]
  ])
}

export function withSetters<State extends object, Action extends object>(set: StoreSetter<State & Action>, storeStates: State): State & Action {
  const actions = Object.fromEntries(Object.entries(storeStates).map(([k, initialState]) => {
    return [setterName(k as keyof State & string), valueOrUpdaterSetter(k, set)]
  })) as Action
  return {
    ...storeStates,
    ...actions
  }
}

// https://docs.pmnd.rs/zustand/guides/auto-generating-selectors
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S,
) => {
  let store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (let k of Object.keys(store.getState())) {
    ; (store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }

  return store
}

type SingleKeyValuePair<K extends string, V> = {
  [P in K]: V;
};
type WithStateSelectors<S> = S extends { getState: () => infer T }
  ? S & { useState: { [K in keyof T]: () => ({ [P in K]: T[K] } & DispatchSetStateActionStateSetters<{ [P in K]: T[K] }>) } }
  : never

  /**
   * To an existing zustand store, adds useState-like selectors.
   * To be used like `const { count, setCount } = store.useState.count()`
   * @param _store 
   * @returns The manipulated store
   */
export const createStateSelectors = <S extends UseBoundStore<StoreApi<object>>, State extends object>(
  _store: S,
) => {
  let store = _store as WithStateSelectors<typeof _store>
  store.useState = {}
  Object.keys(store.getState()).forEach(k => {
    (store.useState as any)[k] = () => {
      return Object.fromEntries([
        [k, store((s) => s[k as keyof typeof s])],
        [setterName(k as keyof State & string), store((s) => s[setterName(k as keyof State & string) as keyof typeof s])],
      ])
    }
  })
  return store
}