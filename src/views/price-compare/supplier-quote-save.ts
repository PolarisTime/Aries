import {
  addSupplierPriceColumn,
  saveSupplierPriceColumnItems,
} from '@/api/market/supplier-price-lists'
import type { ColumnSavePlan } from './supplier-price-list-model'

export type PersistColumnPlansResult = {
  saved: number
  failed: string[]
}

export type PersistColumnPlansOptions = {
  supplierId: string
  /** 新建品牌列时写入的业务报价日期（`YYYY-MM-DD`）。 */
  quotedOn: string
  plans: readonly ColumnSavePlan[]
  /** 某列保存成功后的回调（清草稿 + 刷新该品牌网格）。 */
  onPlanSaved: (brandName: string) => void | Promise<void>
  /**
   * 某列保存失败后的回调。
   *
   * <p>`createdColumn` 为 true 表示失败发生在「建列成功、提交条目失败」之后：调用方需要刷新该品牌，
   * 否则下次重试会因「该供应商在此品牌下已有价格表」再次失败。</p>
   */
  onPlanFailed: (
    brandName: string,
    createdColumn: boolean,
  ) => void | Promise<void>
}

/**
 * 顺序保存各品牌列：需要时先建列，再整组替换该列条目。
 *
 * <p><b>为什么顺序而不是并发</b>：同一供应商的多列共用页面状态，并发保存一旦有 409，
 * 很难向用户解释哪一列成功、哪一列没保存。顺序执行让"已保存的品牌列表"是确定的。</p>
 *
 * <p>本函数不抛出业务错误：单列失败只记录并回调，由调用方统一提示（改动保留在页面上）。
 * 回调自身的异常也被吞掉，避免"刷新失败"被误报成"保存失败"。</p>
 */
export async function persistColumnPlans(
  options: PersistColumnPlansOptions,
): Promise<PersistColumnPlansResult> {
  const failed: string[] = []
  let saved = 0

  for (const plan of options.plans) {
    let createdColumn = false
    try {
      let column = plan.column
      if (!column) {
        column = await addSupplierPriceColumn({
          brandName: plan.brandName,
          supplierId: options.supplierId,
          quotedOn: options.quotedOn,
        })
        createdColumn = true
      }
      await saveSupplierPriceColumnItems(
        column.listId,
        column.version,
        plan.items,
      )
      saved += 1
      try {
        await options.onPlanSaved(plan.brandName)
      } catch {
        // 保存已成功；刷新通知失败不应把这一列算成失败
      }
    } catch {
      failed.push(plan.brandName)
      try {
        await options.onPlanFailed(plan.brandName, createdColumn)
      } catch {
        // 失败回调（刷新草稿/网格）自身出错不影响"改动已保留"的结论
      }
    }
  }

  return { saved, failed }
}
