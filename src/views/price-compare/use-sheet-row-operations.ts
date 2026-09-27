import type { Dispatch, SetStateAction } from 'react'
import { makeRow, makeSeparatorRow, moveItem } from './core'
import type { Brand, PriceRow, PriceSheet } from './types'

interface SheetRowOperationsParams {
  rows: PriceRow[]
  selectedIds: string[]
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  brands: Brand[]
  sheet: PriceSheet
  patchSheet: (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => void
  setSelectedIds: Dispatch<SetStateAction<string[]>>
}

/** 复制一份 inputs 并清掉这些行在所有品牌下的现货/供应商输入。 */
function withoutRowInputs(
  sheet: PriceSheet,
  brands: Brand[],
  rowIds: Iterable<string>,
) {
  const nextInputs = { ...sheet.inputs }
  for (const brand of brands) {
    for (const rowId of rowIds) {
      delete nextInputs[`${brand.name}:${rowId}`]
    }
  }
  return nextInputs
}

/**
 * 报单比价的整行增删与排序操作。
 *
 * <p>从 SheetPanel 里抽出来有两个原因: 一是这个超长组件不能再继续膨胀(react-doctor 的
 * `no-giant-component`), 二是「删除所选行」「拖拽重排」「右键菜单的上移/下移/插入/删除」
 * 必须共用同一份 rows 与 inputs 清理口径, 避免两套实现慢慢漂移。</p>
 */
export function useSheetRowOperations({
  rows,
  selectedIds,
  setRows,
  brands,
  sheet,
  patchSheet,
  setSelectedIds,
}: SheetRowOperationsParams) {
  /** 删除当前勾选的所有行(连带清理这些行各品牌的现货/供应商输入)。 */
  const removeSelected = () => {
    const ids = new Set(selectedIds)
    if (!ids.size) return
    setRows((list) => list.filter((row) => !ids.has(row.id)))
    patchSheet(sheet.id, { inputs: withoutRowInputs(sheet, brands, ids) })
    setSelectedIds([])
  }

  const reorderRow = (fromId: string, toId: string, after: boolean) =>
    setRows((list) => {
      const from = list.findIndex((row) => row.id === fromId)
      const to = list.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      const insert = from < to ? (after ? to : to - 1) : after ? to + 1 : to
      return moveItem(list, from, insert)
    })

  const addRow = () => setRows((list) => [...list, makeRow()])

  const addSeparator = () => setRows((list) => [...list, makeSeparatorRow()])

  /**
   * 上移/下移一行: 复用拖拽排序的口径(与相邻行交换), 作为拖拽的键盘等价物。
   * 首行上移、末行下移由调用方先禁用, 这里再兜一次边界。
   */
  const moveRow = (rowId: string, delta: -1 | 1) => {
    const index = rows.findIndex((row) => row.id === rowId)
    if (index < 0) return
    const neighbor = rows[index + delta]
    if (!neighbor) return
    reorderRow(rowId, neighbor.id, delta > 0)
  }

  /** 在指定行上方/下方插入商品行或隔断行(现有 addRow/addSeparator 只能追加到末尾)。 */
  const insertRowAt = (
    rowId: string,
    kind: 'PRODUCT' | 'SEPARATOR',
    position: 'above' | 'below',
  ) =>
    setRows((list) => {
      const index = list.findIndex((row) => row.id === rowId)
      if (index < 0) return list
      const next = [...list]
      next.splice(
        position === 'above' ? index : index + 1,
        0,
        kind === 'SEPARATOR' ? makeSeparatorRow() : makeRow(),
      )
      return next
    })

  /** 删除单行: 与「删除所选行」同一口径, 连带清理该行各品牌的现货/供应商输入。 */
  const deleteRow = (rowId: string) => {
    setRows((list) => list.filter((row) => row.id !== rowId))
    patchSheet(sheet.id, { inputs: withoutRowInputs(sheet, brands, [rowId]) })
    setSelectedIds((current) => current.filter((id) => id !== rowId))
  }

  return {
    removeSelected,
    reorderRow,
    addRow,
    addSeparator,
    moveRow,
    insertRowAt,
    deleteRow,
  }
}
