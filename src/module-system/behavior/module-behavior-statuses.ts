import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'

// 有行项目明细的单据模块（同时用于已审核状态锁定行为，两处共用同一清单）。
const lineItemModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
  'freight-statement',
] as const satisfies readonly ModuleKey[]

const amountModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
] as const satisfies readonly ModuleKey[]

const draftStatusByModule = [
  ['purchase-order', DOCUMENT_STATUS.DRAFT],
  ['purchase-inbound', DOCUMENT_STATUS.DRAFT],
  ['sales-order', DOCUMENT_STATUS.DRAFT],
  ['sales-outbound', DOCUMENT_STATUS.DRAFT],
  ['sales-return', DOCUMENT_STATUS.DRAFT],
  ['freight-bill', DOCUMENT_STATUS.DRAFT],
  ['freight-statement', DOCUMENT_STATUS.DRAFT],
  ['customer-statement', DOCUMENT_STATUS.PENDING_CONFIRM],
  ['receipt', DOCUMENT_STATUS.DRAFT],
  ['payment', DOCUMENT_STATUS.DRAFT],
] as const satisfies ReadonlyArray<readonly [ModuleKey, string]>

const approvedStatusModules = lineItemModules

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
    registerModuleBehavior(key, { auditStatus: DOCUMENT_STATUS.AUDITED })
  }

  registerModuleBehavior('sales-order', {
    auditSourceStatuses: [DOCUMENT_STATUS.DRAFT],
    reverseAuditTargetsByStatus: {
      [DOCUMENT_STATUS.SALES_COMPLETED]: DOCUMENT_STATUS.DELIVERY_VERIFICATION,
    },
  })

  registerModuleBehavior('purchase-inbound', {
    reverseAuditTargetsByStatus: {
      [DOCUMENT_STATUS.INBOUND_COMPLETED]: DOCUMENT_STATUS.DRAFT,
    },
  })

  registerModuleBehavior('receipt', {
    auditStatus: DOCUMENT_STATUS.AUDITED,
    auditSourceStatuses: [DOCUMENT_STATUS.DRAFT],
    supportsReverseAudit: false,
  })
  registerModuleBehavior('payment', {
    auditStatus: DOCUMENT_STATUS.AUDITED,
    auditSourceStatuses: [DOCUMENT_STATUS.DRAFT],
    supportsReverseAudit: false,
  })
  registerModuleBehavior('customer-statement', {
    auditStatus: DOCUMENT_STATUS.CONFIRMED,
  })
}

/** 终态保护状态：进入后默认禁止编辑与删除（两集合由单一来源派生，防止单侧漏维护）。 */
const PROTECTED_TERMINAL_STATUSES: readonly string[] = [
  DOCUMENT_STATUS.AUDITED,
  DOCUMENT_STATUS.COMPLETED,
  DOCUMENT_STATUS.PURCHASE_COMPLETED,
  DOCUMENT_STATUS.INBOUND_COMPLETED,
  DOCUMENT_STATUS.DELIVERY_VERIFICATION,
  DOCUMENT_STATUS.SALES_COMPLETED,
  DOCUMENT_STATUS.CONFIRMED,
  DOCUMENT_STATUS.PAID,
  DOCUMENT_STATUS.RECEIVED,
  DOCUMENT_STATUS.SIGNED,
  DOCUMENT_STATUS.ARCHIVED,
]

export const protectedEditStatuses: ReadonlySet<string> = new Set(
  PROTECTED_TERMINAL_STATUSES,
)

export const protectedDeleteStatuses: ReadonlySet<string> = new Set(
  PROTECTED_TERMINAL_STATUSES,
)
