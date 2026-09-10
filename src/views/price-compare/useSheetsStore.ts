import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { makeRow, makeSheet } from './core'
import type { Brand, PriceRow, PriceSheet } from './types'

const LS_KEY = 'aries-price-compare-v1'
const HISTORY_LIMIT = 50
const COALESCE_MS = 800

type Snapshot = {
  sheets: PriceSheet[]
  activeId: string
  rows: PriceRow[]
  brands: Brand[]
}

function defaultState(): Snapshot {
  const a = makeSheet(
    '9月6日报单',
    '',
    '2026-09-06',
    '2026-09-07',
    '12:00 中午',
  )
  const b = makeSheet('9月9日报单', '', '2026-09-09', '2026-09-10', '9:30 上午')
  return {
    sheets: [a, b],
    activeId: a.id,
    rows: [
      ...[12, 14, 16, 18, 20, 22, 25].map((spec) => ({
        ...makeRow('螺纹钢'),
        spec,
        length: '9米',
      })),
      ...[6, 8, 10].map((spec) => ({ ...makeRow('盘螺'), spec, length: '-' })),
    ],
    brands: [],
  }
}

function loadState(): Snapshot {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Snapshot
      if (parsed.sheets?.length && parsed.rows) return parsed
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
  addSheet: (projectId: string) => void
  removeSheet: (id: string) => void
}

type History = {
  past: Snapshot[]
  future: Snapshot[]
  lastKey: string
  lastTime: number
}

/** 多单据状态 + 撤销/重做 + 本地持久化(后续可替换为后端保存)。 */
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
    localStorage.setItem(LS_KEY, JSON.stringify(state))
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

  const setRows = (updater: (current: PriceRow[]) => PriceRow[]) =>
    apply((current) => ({ ...current, rows: updater(current.rows) }))
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
  const addSheet = (projectId: string) =>
    apply((current) => {
      const sheet = makeSheet(
        `单据 ${current.sheets.length + 1}`,
        projectId,
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

  const active = useMemo(
    () =>
      state.sheets.find((sheet) => sheet.id === state.activeId) ??
      state.sheets[0],
    [state.sheets, state.activeId],
  )

  return {
    sheets: state.sheets,
    activeId: state.activeId,
    active,
    rows: state.rows,
    brands: state.brands,
    canUndo: historyRef.current.past.length > 0,
    canRedo: historyRef.current.future.length > 0,
    undo,
    redo,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    removeSheet,
  }
}
