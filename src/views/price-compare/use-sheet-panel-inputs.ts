import type { PriceRow, PriceSheet } from './types'

/**
 * SheetPanel 的单元格只读取数与行级写入动作。
 *
 * <p>报单比价页**默认禁止手动改价，无例外**：现货价与供应商的唯一来源是
 * 「从供应商价格表导入」（见 `spot-from-price-list.ts`），因此这里不再有
 * `setSpot` / `setSupplier` / `clearSpotSource` 这些手工写入动作 ——
 * 只保留行级字段（吨位/规格/备注/锁定）写入与只读取数。</p>
 */

interface Options {
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  sheet: PriceSheet
}

export function useSheetPanelInputActions({ setRows, sheet }: Options) {
  const patchRow = (rowId: string, patch: Partial<PriceRow>) =>
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )

  const getInput = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]

  /** 派生自 getInput，勿另读 sheet.inputs —— 同一格的取数只有 getInput 一个入口。 */
  const getSpot = (brandName: string, rowId: string): number | undefined =>
    getInput(brandName, rowId)?.spot

  return { getInput, getSpot, patchRow }
}
