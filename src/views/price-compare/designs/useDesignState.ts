import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { countMissing, resolveRef } from '../core'
import type { Brand, PriceData, PriceSheet } from '../types'
import { usePriceCompareData } from '../usePriceCompareData'
import { useSheetsStore } from '../useSheetsStore'

export type ProjectGroup = {
  projectId: string
  projectName: string
  sheets: PriceSheet[]
}

/** 设计草案共享状态: 数据源 + 单据持久化 + 项目/批次分组。 */
export function useDesignState() {
  const { data, varieties, projects, catalog, loading } = usePriceCompareData()
  const store = useSheetsStore()
  const {
    sheets,
    activeId,
    active,
    rows,
    brands,
    settings,
    setSettings,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    addSheet,
    removeSheet,
  } = store

  const assignProjectToUnassigned = store.assignProjectToUnassigned
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || !projects.length) return
    initialized.current = true
    const first = projects[0]
    assignProjectToUnassigned(first.id, first.abbr || first.name)
    setBrands((current) =>
      current.length
        ? current
        : catalog.map((item) => ({ name: item.name, freight: item.freight })),
    )
  }, [projects, catalog, assignProjectToUnassigned, setBrands])

  const projectGroups = useMemo(() => {
    const groups: ProjectGroup[] = []
    for (const sheet of sheets) {
      let group = groups.find((item) => item.projectId === sheet.projectId)
      if (!group) {
        group = {
          projectId: sheet.projectId,
          projectName: sheet.projectName,
          sheets: [],
        }
        groups.push(group)
      }
      group.sheets.push(sheet)
    }
    return groups
  }, [sheets])

  const dates = useMemo(
    () => (data ? Object.keys(data).sort().reverse() : []),
    [data],
  )
  const defaultRefDate = dates[0] ?? ''
  const defaultRefPeriod =
    defaultRefDate && data
      ? (Object.keys(data[defaultRefDate] ?? {})[0] ?? '')
      : ''
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const createBatch = (projectId: string, projectName: string) =>
    addSheet(
      projectId,
      projectName,
      active?.orderDate || today,
      defaultRefDate,
      defaultRefPeriod,
    )

  return {
    data,
    varieties,
    projects,
    catalog,
    loading,
    sheets,
    activeId,
    active,
    rows,
    brands,
    settings,
    setSettings,
    setRows,
    setBrands,
    setActiveId,
    patchSheet,
    removeSheet,
    projectGroups,
    createBatch,
    missingOf: (sheet: PriceSheet) =>
      countMissing(
        data,
        { ...sheet, ...resolveRef(data, sheet) },
        sheet.rows,
        brands,
      ),
  }
}

export type DesignState = ReturnType<typeof useDesignState>
export type { Brand, Dispatch, PriceData, PriceSheet, SetStateAction }
