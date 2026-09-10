import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { copySheet, DEFAULT_LENGTH_PREMIUM, makeSheet } from './core'
import type { Brand, PriceRow, PriceSheet } from './types'

const LS_KEY = 'aries-price-compare-v2'
const HISTORY_LIMIT = 50
const COALESCE_MS = 800

type Snapshot = {
  sheets: PriceSheet[]
  activeId: string
  brands: Brand[]
  settings: { lengthPremium: number }
}

function defaultState(): Snapshot {
  const a = makeSheet('批次 1', '', '', '', '', '')
  const b = makeSheet('批次 2', '', '', '', '', '')
  return {
    sheets: [a, b],
    activeId: a.id,
    brands: [],
    settings: { lengthPremium: DEFAULT_LENGTH_PREMIUM },
  }
}

function loadState(): Snapshot {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Snapshot
      if (
        parsed.sheets?.length &&
        parsed.sheets.every((sheet) => Array.isArray(sheet.rows))
      )
        return parsed
    }
  } catch {
    // ignore malformed storage
  }
  return defaultState()
}

export type SheetsStore = {
  sheets: PriceSheet[]
  activeId: string
  active: PriceSheet
  rows: PriceRow[]
  brands: Brand[]
  settings: { lengthPremium: number }
  setSettings: (patch: Partial<{ lengthPremium: number }>) => void
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  setBrands: (value: Brand[] | ((current: Brand[]) => Brand[])) => void
  setActiveId: (id: string) => void
  patchSheet: (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => void
  addSheet: (
    projectId: string,
    projectName: string,
    orderDate: string,
    refDate: string,
    refPeriod: string,
  ) => void
  copyActiveSheet: () => void
  assignProjectToUnassigned: (projectId: string, projectName: string) => void
  removeSheet: (id: string) => void
}

type History = {
  past: Snapshot[]
  future: Snapshot[]
  lastKey: string
  lastTime: number
}

/** 多单据状态(行随单据独立) + 撤销/重做 + 本地持久化。 */
export function useSheetsStore(): SheetsStore {
  const [state, setState] = useState<Snapshot>(() => loadState())
  const [, forceRender] = useState(0)
  const stateRef = useRef(state)
  const historyRef = useRef<History>({
    past: [],
    future: [],
    lastKey: '',
    lastTime: 0,
  })

  useEffect(() => {
    stateRef.current = state
    const timer = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    }, 300)
    return () => clearTimeout(timer)
  }, [state])

  const commit = useCallback((next: Snapshot, coalesceKey?: string) => {
    const history = historyRef.current
    const now = Date.now()
    const coalesce =
      Boolean(coalesceKey) &&
      coalesceKey === history.lastKey &&
      now - history.lastTime < COALESCE_MS
    if (!coalesce) {
      history.past = [
        ...history.past.slice(-(HISTORY_LIMIT - 1)),
        stateRef.current,
      ]
      history.future = []
    }
    history.lastKey = coalesceKey ?? ''
    history.lastTime = now
    stateRef.current = next
    setState(next)
    forceRender((version) => version + 1)
  }, [])

  const apply = useCallback(
    (updater: (current: Snapshot) => Snapshot, coalesceKey?: string) => {
      const next = updater(stateRef.current)
      if (next === stateRef.current) return
      commit(next, coalesceKey)
    },
    [commit],
  )

  const undo = useCallback(() => {
    const history = historyRef.current
    if (!history.past.length) return
    const target = history.past[history.past.length - 1]
    history.past = history.past.slice(0, -1)
    history.future = [stateRef.current, ...history.future].slice(
      0,
      HISTORY_LIMIT,
    )
    history.lastKey = ''
    stateRef.current = target
    setState(target)
    forceRender((version) => version + 1)
  }, [])

  const redo = useCallback(() => {
    const history = historyRef.current
    if (!history.future.length) return
    const target = history.future[0]
    history.future = history.future.slice(1)
    history.past = [
      ...history.past.slice(-(HISTORY_LIMIT - 1)),
      stateRef.current,
    ]
    history.lastKey = ''
    stateRef.current = target
    setState(target)
    forceRender((version) => version + 1)
  }, [])

  const setSettings = (patch: Partial<{ lengthPremium: number }>) =>
    apply((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }))

  const active = useMemo(
    () =>
      state.sheets.find((sheet) => sheet.id === state.activeId) ??
      state.sheets[0],
    [state.sheets, state.activeId],
  )

  const updateActiveRows = (updater: (rows: PriceRow[]) => PriceRow[]) =>
    apply((current) => {
      const activeId = current.activeId
      return {
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.id === activeId
            ? { ...sheet, rows: updater(sheet.rows) }
            : sheet,
        ),
      }
    })

  const setBrands = (value: Brand[] | ((current: Brand[]) => Brand[])) =>
    apply((current) => ({
      ...current,
      brands: typeof value === 'function' ? value(current.brands) : value,
    }))
  const setActiveId = (id: string) =>
    setState((current) => ({ ...current, activeId: id }))
  const patchSheet = (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) =>
    apply(
      (current) => ({
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.id === id ? { ...sheet, ...patch } : sheet,
        ),
      }),
      coalesceKey,
    )
  const addSheet = (projectId: string, projectName: string) =>
    apply((current) => {
      const count =
        current.sheets.filter((sheet) => sheet.projectId === projectId).length +
        1
      const sheet = makeSheet(
        `批次 ${count}`,
        projectId,
        projectName,
        new Date().toISOString().slice(0, 10),
        '2026-09-10',
        '9:30 上午',
      )
      return {
        ...current,
        sheets: [...current.sheets, sheet],
        activeId: sheet.id,
      }
    })
  const copyActiveSheet = () =>
    apply((current) => {
      const source = current.sheets.find(
        (sheet) => sheet.id === current.activeId,
      )
      if (!source) return current
      const copy = copySheet(source)
      const index = current.sheets.findIndex(
        (sheet) => sheet.id === current.activeId,
      )
      const next = [...current.sheets]
      next.splice(index + 1, 0, copy)
      return { ...current, sheets: next, activeId: copy.id }
    })
  const assignProjectToUnassigned = (projectId: string, projectName: string) =>
    apply((current) => {
      if (!projectId || !current.sheets.some((sheet) => !sheet.projectId))
        return current
      return {
        ...current,
        sheets: current.sheets.map((sheet) =>
          sheet.projectId ? sheet : { ...sheet, projectId, projectName },
        ),
      }
    })
  const removeSheet = (id: string) =>
    apply((current) => {
      const next = current.sheets.filter((sheet) => sheet.id !== id)
      if (!next.length) return current
      return {
        ...current,
        sheets: next,
        activeId:
          id === current.activeId ? next[next.length - 1].id : current.activeId,
      }
    })

  return {
    sheets: state.sheets,
    activeId: state.activeId,
    active,
    rows: active?.rows ?? [],
    brands: state.brands,
    settings: state.settings,
    setSettings,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undo,
    redo,
    setRows: updateActiveRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    copyActiveSheet,
    assignProjectToUnassigned,
    removeSheet,
  }
}
