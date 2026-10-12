import type { TFunction } from 'i18next'
import { message } from '@/utils/antd-app'
import { fillSupplierInputs, syncSpotInputs } from './core'
import type { PriceRow, PriceSheet, SheetInputs } from './types'

/**
 * SheetPanel 的单元格输入读写动作：现货价、供应商简称与批量填入。
 *
 * <p>抽出原因：这 6 个回调（getSpot / patchRow / setSpot / getInput / setSupplier /
 * fillSupplier）在组件里占约 100 行，是 no-giant-component (>300 行) 的主要行数来源；
 * 它们只依赖单据、行与写入回调，与表格渲染无关。逻辑逐字搬运：现货价联动、
 * 「仅本次会话改过价的行」过滤、无现货无供应商时删除输入的规则均未改变。</p>
 */

interface Options {
  /** 消费本次会话改价的标记（批量填入后调用）。 */
  consumeSpotsTouched: (itemIds: string[]) => void
  /** 记录本次会话改价的行（仅数值真正变化的行）。 */
  markSpotsTouched: (itemIds: string[]) => void
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  rows: PriceRow[]
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  sheet: PriceSheet
  /** 本次会话内改过现货价的行键集合（品牌:行id）。 */
  spotTouchedKeys: ReadonlySet<string>
  t: TFunction
}

export function useSheetPanelInputActions({
  consumeSpotsTouched,
  markSpotsTouched,
  patchSheet,
  rows,
  setRows,
  sheet,
  spotTouchedKeys,
  t,
}: Options) {
  const getSpot = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]?.spot

  const patchRow = (rowId: string, patch: Partial<PriceRow>) =>
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )

  /** 现货价联动: 同批次内 品牌+类别+材质+规格+长度 相同则同步。 */
  const setSpot = (
    brandName: string,
    rowId: string,
    value: number | undefined,
  ) => {
    const { inputs, targets } = syncSpotInputs(
      rows,
      sheet.inputs,
      brandName,
      rowId,
      value,
    )
    patchSheet(sheet.id, { inputs })
    // 仅记录本次会话现货价实际发生变动(新增/改动)的行: 数值未变的不参与后续批量填入供应商。
    const changedTargets = targets
      .filter(
        (target) =>
          value !== undefined &&
          sheet.inputs[`${brandName}:${target.id}`]?.spot !== value,
      )
      .map((target) => `${brandName}:${target.id}`)
    markSpotsTouched(changedTargets)
    const text = value === undefined ? '' : String(value)
    for (const target of targets) {
      if (target.id === rowId) continue
      const input = document.querySelector<HTMLInputElement>(
        `input[data-spot="${brandName}:${target.id}"]`,
      )
      if (input) input.value = text
    }
  }

  const getInput = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]

  /** 记录/清除现货价来源供应商; 无现货也无供应商时删除该输入。 */
  const setSupplier = (
    brandName: string,
    rowId: string,
    option: { value: string; label: string } | undefined,
  ) => {
    const key = `${brandName}:${rowId}`
    const inputs: SheetInputs = { ...sheet.inputs }
    const prev = inputs[key] ?? {}
    if (!option) {
      const {
        supplierId: _supplierId,
        supplierName: _supplierName,
        ...rest
      } = prev
      if (rest.spot === undefined && rest.ton === undefined) {
        delete inputs[key]
      } else {
        inputs[key] = rest
      }
    } else {
      inputs[key] = {
        ...prev,
        supplierId: option.value,
        supplierName: option.label,
      }
    }
    patchSheet(sheet.id, { inputs })
  }

  /**
   * 批量填入供应商: 仅作用于「本次会话内改过现货价」的目标行, 覆盖其已有简称;
   * 未改价的行保留原简称, 避免换第 N 家时误改已定价的其它供应商行。仅改简称, 不动现货价。
   */
  const fillSupplier = (
    brandName: string,
    rowIds: string[],
    option: { value: string; label: string } | undefined,
  ) => {
    const eligibleIds = rowIds.filter((rowId) =>
      spotTouchedKeys.has(`${brandName}:${rowId}`),
    )
    if (!eligibleIds.length) {
      message.info(t('priceCompare.sheet.fillSupplierNoChangedRows'))
      return
    }
    const inputs = fillSupplierInputs(
      rows,
      sheet.inputs,
      brandName,
      eligibleIds,
      option,
    )
    if (inputs !== sheet.inputs) patchSheet(sheet.id, { inputs })
    consumeSpotsTouched(eligibleIds.map((rowId) => `${brandName}:${rowId}`))
  }

  return { fillSupplier, getInput, getSpot, patchRow, setSpot, setSupplier }
}
