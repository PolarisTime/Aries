import { useCallback, useRef } from 'react'
import {
  type AllowedSpecViolations,
  resolveSalesOrderItemScopeCheck,
} from '@/config/business-pages/operations/sales-order-rules'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

/** 项目允许范围的两个维度，与明细行的品牌/材质字段同名。 */
export type ProjectScopeSpecDimension = 'brand' | 'material'

const PROJECT_SCOPE_SPEC_DIMENSIONS: readonly ProjectScopeSpecDimension[] = [
  'brand',
  'material',
]

/** 行级即时提示只对销售订单生效；其它模块（采购订单/入库/退货…）零影响。 */
const PROJECT_SCOPE_HINT_MODULE_KEY = 'sales-order'

/** 已提示过的越界取值：行 id → 维度 → 取值。 */
type HintedSpecValues = Map<
  string,
  Partial<Record<ProjectScopeSpecDimension, string>>
>

function readSpecValue(
  item: ModuleLineItem | undefined,
  dimension: ProjectScopeSpecDimension,
): string {
  return asString(item?.[dimension]).trim()
}

/**
 * 本次改写里品牌/材质确实变了的行（新行也算）。
 *
 * <p>按值比较而不是对象身份：价格回填、仓库推荐等会整行重建对象，但品牌/材质没变时不该提示。
 * 判定只覆盖品牌/材质，数量、单价等列怎么写都不会误触发。</p>
 */
export function collectSpecRewriteItems(
  prevItems: readonly ModuleLineItem[],
  nextItems: readonly ModuleLineItem[],
): ModuleLineItem[] {
  const prevById = new Map(prevItems.map((item) => [String(item.id), item]))
  return nextItems.filter((item) => {
    const prev = prevById.get(String(item.id))
    if (!prev) {
      return true
    }
    return PROJECT_SCOPE_SPEC_DIMENSIONS.some(
      (dimension) =>
        readSpecValue(prev, dimension) !== readSpecValue(item, dimension),
    )
  })
}

/** 行被删除后重置去重状态：去重表只保留仍然存在的行。 */
function resetRemovedItems(
  hinted: HintedSpecValues,
  nextItems: readonly ModuleLineItem[],
) {
  if (!hinted.size) {
    return
  }
  const aliveIds = new Set(nextItems.map((item) => String(item.id)))
  for (const itemId of [...hinted.keys()]) {
    if (!aliveIds.has(itemId)) {
      hinted.delete(itemId)
    }
  }
}

/**
 * 单行判定的越界取值：每个维度至多一个值（{@link AllowedSpecViolations} 已按值去重，
 * 而单行明细每个维度只有一个取值）。
 */
function collectViolatedSpecValues(
  violations: AllowedSpecViolations,
): Partial<Record<ProjectScopeSpecDimension, string>> {
  const values: Partial<Record<ProjectScopeSpecDimension, string>> = {}
  const brand = violations.brands[0]
  const material = violations.materials[0]
  if (brand) {
    values.brand = brand
  }
  if (material) {
    values.material = material
  }
  return values
}

/**
 * 该行是否还有「没提示过」的越界维度。
 *
 * <p>同一行 + 同一维度 + 同一越界值只提示一次；维度改回允许范围或清空后条目会被清掉，
 * 用户修正后再越界可以再次提示。</p>
 */
function hasUnhintedViolation(
  hinted: HintedSpecValues,
  item: ModuleLineItem,
  violated: Partial<Record<ProjectScopeSpecDimension, string>>,
): boolean {
  const previouslyHinted = hinted.get(String(item.id))
  return PROJECT_SCOPE_SPEC_DIMENSIONS.some(
    (dimension) =>
      Boolean(violated[dimension]) &&
      previouslyHinted?.[dimension] !== violated[dimension],
  )
}

export interface ProjectScopeItemHintOptions {
  moduleKey: string
  /** 写入发生时读取当前单据；与导入路径同源（单据表单上的 customerId/projectId）。 */
  resolveCurrentRecord: () => ModuleRecordInput
}

/**
 * 销售订单明细的「项目允许范围」即时提示：手工加行 / 改品牌材质时立刻提醒，不等保存。
 *
 * <p>原实现只有导入路径（{@link resolveSalesOrderPurchaseSourceImportCheck} 的 BLOCK/WARN 挂载点）
 * 与保存时的服务端兜底，手工改品牌/材质要等提交 422 才知道越界。这里把同一份项目范围规则
 * （{@link resolveSalesOrderItemScopeCheck}）前移到明细写入时机：命中即 <code>message.warning</code>，
 * 但**不阻断编辑**——表格式录入打断成本高，最终仍由服务端 422 拦。</p>
 *
 * <p>接线口径：只在销售订单生效；调用方在「明细被改写」的写入点上把改写前后的数组交给返回函数，
 * 由它自己挑出品牌/材质真的变了的行。导入路径（{@link useParentImportController} 的 replaceItems）
 * 不经过这里，因此不会与导入预警重复弹两条消息。</p>
 */
export function useProjectScopeItemHint({
  moduleKey,
  resolveCurrentRecord,
}: ProjectScopeItemHintOptions) {
  const hintedSpecValuesRef = useRef<HintedSpecValues>(new Map())

  return useCallback(
    (
      prevItems: readonly ModuleLineItem[],
      nextItems: readonly ModuleLineItem[],
    ) => {
      if (moduleKey !== PROJECT_SCOPE_HINT_MODULE_KEY) {
        return
      }
      const hinted = hintedSpecValuesRef.current
      resetRemovedItems(hinted, nextItems)
      const rewrittenItems = collectSpecRewriteItems(prevItems, nextItems)
      if (!rewrittenItems.length) {
        return
      }
      const currentRecord = resolveCurrentRecord()
      for (const item of rewrittenItems) {
        const check = resolveSalesOrderItemScopeCheck({ currentRecord, item })
        if (!check.message) {
          // 改回允许范围或清空后重置，便于再次越界时重新提示。
          hinted.delete(String(item.id))
          continue
        }
        const violated = collectViolatedSpecValues(check.violations)
        if (!hasUnhintedViolation(hinted, item, violated)) {
          continue
        }
        message.warning(check.message)
        hinted.set(String(item.id), violated)
      }
    },
    [moduleKey, resolveCurrentRecord],
  )
}
