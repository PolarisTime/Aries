import { useEffect, useState } from 'react'
import { makeRow, makeSheet } from './core'
import type { Brand, PriceRow, PriceSheet } from './types'

const LS_KEY = 'aries-price-compare-v1'

type PersistedState = {
  sheets: PriceSheet[]
  activeId: string
  rows: PriceRow[]
  brands: Brand[]
}

function defaultState(): PersistedState {
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

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState
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
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  setBrands: (value: Brand[] | ((current: Brand[]) => Brand[])) => void
  setActiveId: (id: string) => void
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  addSheet: (projectId: string) => void
  removeSheet: (id: string) => void
}

/** 多单据状态 + 本地持久化(后续可替换为后端保存)。 */
export function useSheetsStore(): SheetsStore {
  const [state, setState] = useState<PersistedState>(() => loadState())
  const { sheets, activeId, rows, brands } = state

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])

  const setRows = (updater: (current: PriceRow[]) => PriceRow[]) =>
    setState((prev) => ({ ...prev, rows: updater(prev.rows) }))
  const setBrands: React.Dispatch<React.SetStateAction<Brand[]>> = (value) =>
    setState((prev) => ({
      ...prev,
      brands: typeof value === 'function' ? value(prev.brands) : value,
    }))
  const setActiveId = (id: string) =>
    setState((prev) => ({ ...prev, activeId: id }))
  const patchSheet = (id: string, patch: Partial<PriceSheet>) =>
    setState((prev) => ({
      ...prev,
      sheets: prev.sheets.map((sheet) =>
        sheet.id === id ? { ...sheet, ...patch } : sheet,
      ),
    }))
  const addSheet = (projectId: string) => {
    const sheet = makeSheet(
      `单据 ${sheets.length + 1}`,
      projectId,
      new Date().toISOString().slice(0, 10),
      '2026-09-10',
      '9:30 上午',
    )
    setState((prev) => ({
      ...prev,
      sheets: [...prev.sheets, sheet],
      activeId: sheet.id,
    }))
  }
  const removeSheet = (id: string) =>
    setState((prev) => {
      const next = prev.sheets.filter((sheet) => sheet.id !== id)
      if (!next.length) return prev
      return {
        ...prev,
        sheets: next,
        activeId:
          id === prev.activeId ? next[next.length - 1].id : prev.activeId,
      }
    })

  const active = sheets.find((sheet) => sheet.id === activeId) ?? sheets[0]

  return {
    sheets,
    activeId,
    active,
    rows,
    brands,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    removeSheet,
  }
}
