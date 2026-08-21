import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'

const lineItemModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'freight-statement',
] as const satisfies readonly ModuleKey[]

const amountModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
] as const satisfies readonly ModuleKey[]

const draftStatusByModule = [
  ['purchase-order', '草稿'],
  ['purchase-inbound', '草稿'],
  ['sales-order', '草稿'],
  ['sales-outbound', '草稿'],
  ['freight-bill', '草稿'],
  ['freight-statement', '草稿'],
  ['customer-statement', '待确认'],
  ['receipt', '草稿'],
  ['payment', '草稿'],
] as const satisfies ReadonlyArray<readonly [ModuleKey, string]>

const approvedStatusModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'freight-statement',
] as const satisfies readonly ModuleKey[]

export const contributeStatusBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
  for (const key of lineItemModules) {
    registerModuleBehavior(key, { supportsLineItems: true })
  }

  for (const key of amountModules) {
    registerModuleBehavior(key, { computesAmounts: true })
  }

  for (const [key, status] of draftStatusByModule) {
    registerModuleBehavior(key, { defaultStatus: status })
  }

  for (const key of approvedStatusModules) {
    registerModuleBehavior(key, { auditStatus: '已审核' })
  }

  registerModuleBehavior('sales-order', {
    auditSourceStatuses: ['草稿'],
    reverseAuditTargetsByStatus: { 完成销售: '交付核定' },
  })

  registerModuleBehavior('purchase-inbound', {
    reverseAuditTargetsByStatus: { 完成入库: '草稿' },
  })

  registerModuleBehavior('receipt', {
    auditStatus: '已审核',
    auditSourceStatuses: ['草稿'],
    supportsReverseAudit: false,
  })
  registerModuleBehavior('payment', {
    auditStatus: '已审核',
    auditSourceStatuses: ['草稿'],
    supportsReverseAudit: false,
  })
  registerModuleBehavior('customer-statement', { auditStatus: '已确认' })
}

/** 终态保护状态：进入后默认禁止编辑与删除（两集合由单一来源派生，防止单侧漏维护）。 */
const PROTECTED_TERMINAL_STATUSES: readonly string[] = [
  '已审核',
  '已完成',
  '完成采购',
  '完成入库',
  '交付核定',
  '完成销售',
  '已确认',
  '已付款',
  '已收款',
  '已签署',
  '已归档',
]

export const protectedEditStatuses: ReadonlySet<string> = new Set(
  PROTECTED_TERMINAL_STATUSES,
)

export const protectedDeleteStatuses: ReadonlySet<string> = new Set(
  PROTECTED_TERMINAL_STATUSES,
)
