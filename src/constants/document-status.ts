import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleStatusMeta } from '@/types/module-page'

/** Ant Design Tag 支持的颜色集合（与 ModuleStatusMeta 保持一致）。 */
export type StatusColor = ModuleStatusMeta['color']

export interface DocumentStatusMeta {
  /** 状态中文值，与后端标签逐字一致。 */
  label: string
  /** 标签颜色。 */
  color: StatusColor
  /** i18n 文案键。 */
  i18nKey: string
}

/**
 * 统一状态展示注册表。
 *
 * 以状态中文值为键，集中维护展示文案键与颜色；`statusMap`
 * （`@/config/business-pages/shared/shared-status`）由此派生，
 * 避免颜色/文案在页面配置中被重复硬编码。
 */
export const DOCUMENT_STATUS_REGISTRY = {
  [DOCUMENT_STATUS.DRAFT]: {
    label: DOCUMENT_STATUS.DRAFT,
    color: 'warning',
    i18nKey: 'modules.status.draft',
  },
  [DOCUMENT_STATUS.UNAUDITED]: {
    label: DOCUMENT_STATUS.UNAUDITED,
    color: 'warning',
    i18nKey: 'modules.status.unaudited',
  },
  [DOCUMENT_STATUS.PENDING_AUDIT]: {
    label: DOCUMENT_STATUS.PENDING_AUDIT,
    color: 'warning',
    i18nKey: 'modules.status.pendingAudit',
  },
  [DOCUMENT_STATUS.AUDITED]: {
    label: DOCUMENT_STATUS.AUDITED,
    color: 'success',
    i18nKey: 'modules.status.audited',
  },
  [DOCUMENT_STATUS.PENDING_APPROVAL]: {
    label: DOCUMENT_STATUS.PENDING_APPROVAL,
    color: 'warning',
    i18nKey: 'modules.status.pendingApproval',
  },
  [DOCUMENT_STATUS.APPROVED]: {
    label: DOCUMENT_STATUS.APPROVED,
    color: 'success',
    i18nKey: 'modules.status.approved',
  },
  [DOCUMENT_STATUS.DELIVERY_VERIFICATION]: {
    label: DOCUMENT_STATUS.DELIVERY_VERIFICATION,
    color: 'processing',
    i18nKey: 'modules.status.deliveryVerification',
  },
  [DOCUMENT_STATUS.PENDING_CONFIRM]: {
    label: DOCUMENT_STATUS.PENDING_CONFIRM,
    color: 'warning',
    i18nKey: 'modules.status.pendingConfirm',
  },
  [DOCUMENT_STATUS.CONFIRMED]: {
    label: DOCUMENT_STATUS.CONFIRMED,
    color: 'success',
    i18nKey: 'modules.status.confirmed',
  },
  [DOCUMENT_STATUS.PURCHASE_COMPLETED]: {
    label: DOCUMENT_STATUS.PURCHASE_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedPurchase',
  },
  [DOCUMENT_STATUS.SALES_COMPLETED]: {
    label: DOCUMENT_STATUS.SALES_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedSales',
  },
  [DOCUMENT_STATUS.INBOUND_COMPLETED]: {
    label: DOCUMENT_STATUS.INBOUND_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedInbound',
  },
  [DOCUMENT_STATUS.PARTIAL_INBOUND]: {
    label: DOCUMENT_STATUS.PARTIAL_INBOUND,
    color: 'processing',
    i18nKey: 'modules.status.partialInbound',
  },
  [DOCUMENT_STATUS.PARTIAL_OUTBOUND]: {
    label: DOCUMENT_STATUS.PARTIAL_OUTBOUND,
    color: 'processing',
    i18nKey: 'modules.status.partialOutbound',
  },
  [DOCUMENT_STATUS.COMPLETED]: {
    label: DOCUMENT_STATUS.COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completed',
  },
  [DOCUMENT_STATUS.SIGNED]: {
    label: DOCUMENT_STATUS.SIGNED,
    color: 'success',
    i18nKey: 'modules.status.signed',
  },
  [DOCUMENT_STATUS.UNSIGNED]: {
    label: DOCUMENT_STATUS.UNSIGNED,
    color: 'warning',
    i18nKey: 'modules.status.unsigned',
  },
  [DOCUMENT_STATUS.EXECUTING]: {
    label: DOCUMENT_STATUS.EXECUTING,
    color: 'processing',
    i18nKey: 'modules.status.executing',
  },
  [DOCUMENT_STATUS.RECEIVED]: {
    label: DOCUMENT_STATUS.RECEIVED,
    color: 'success',
    i18nKey: 'modules.status.received',
  },
  [DOCUMENT_STATUS.PAID]: {
    label: DOCUMENT_STATUS.PAID,
    color: 'success',
    i18nKey: 'modules.status.paid',
  },
  [DOCUMENT_STATUS.PARTIAL_SETTLED]: {
    label: DOCUMENT_STATUS.PARTIAL_SETTLED,
    color: 'processing',
    i18nKey: 'modules.status.partialSettled',
  },
  [DOCUMENT_STATUS.ARCHIVED]: {
    label: DOCUMENT_STATUS.ARCHIVED,
    color: 'success',
    i18nKey: 'modules.status.archived',
  },
  [DOCUMENT_STATUS.NORMAL]: {
    label: DOCUMENT_STATUS.NORMAL,
    color: 'success',
    i18nKey: 'modules.status.normal',
  },
  [DOCUMENT_STATUS.DISABLED]: {
    label: DOCUMENT_STATUS.DISABLED,
    color: 'error',
    i18nKey: 'modules.status.disabled',
  },
  [DOCUMENT_STATUS.SUCCESS]: {
    label: DOCUMENT_STATUS.SUCCESS,
    color: 'success',
    i18nKey: 'modules.status.success',
  },
  [DOCUMENT_STATUS.FAILED]: {
    label: DOCUMENT_STATUS.FAILED,
    color: 'error',
    i18nKey: 'modules.status.failed',
  },
  [DOCUMENT_STATUS.DELETED]: {
    label: DOCUMENT_STATUS.DELETED,
    color: 'error',
    i18nKey: 'modules.status.deleted',
  },
} as const satisfies Record<string, DocumentStatusMeta>

export type DocumentStatusLabel = keyof typeof DOCUMENT_STATUS_REGISTRY

const FALLBACK_STATUS_COLOR: StatusColor = 'default'

/** 判断给定中文状态值是否已在注册表中登记。 */
export function isKnownStatus(label: string): label is DocumentStatusLabel {
  return Object.hasOwn(DOCUMENT_STATUS_REGISTRY, label)
}

/** 获取状态颜色，未知状态回退为 `default`，不抛错。 */
export function getStatusColor(label: string): StatusColor {
  return isKnownStatus(label)
    ? DOCUMENT_STATUS_REGISTRY[label].color
    : FALLBACK_STATUS_COLOR
}
