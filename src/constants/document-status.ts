import {
  DOCUMENT_STATUS,
  STATUS_LABELS,
  statusLabel,
} from '@/constants/status-constants'
import type { ModuleStatusMeta } from '@/types/module-page'

/** Ant Design Tag 支持的颜色集合（与 ModuleStatusMeta 保持一致）。 */
export type StatusColor = ModuleStatusMeta['color']

export interface DocumentStatusMeta {
  /** 状态中文文案，取自 `STATUS_LABELS`（中文只在那里集中一份）。 */
  label: string
  /** 标签颜色。 */
  color: StatusColor
  /** i18n 文案键。 */
  i18nKey: string
}

/**
 * 统一状态展示注册表。
 *
 * 以状态 **code**（`DRAFT` / `AUDITED` …）为键，集中维护展示文案键与颜色；
 * `statusMap`（`@/config/business-pages/shared/shared-status`）由此派生，
 * 避免颜色/文案在页面配置中被重复硬编码。
 *
 * <p>键与后端 `DocumentStatus.code()` 逐字一致；中文文案不在这里重复登记，
 * 一律引用 `STATUS_LABELS`，否则同一条状态会出现两处中文各自漂移。</p>
 */
export const DOCUMENT_STATUS_REGISTRY = {
  [DOCUMENT_STATUS.DRAFT]: {
    label: STATUS_LABELS.DRAFT,
    color: 'warning',
    i18nKey: 'modules.status.draft',
  },
  [DOCUMENT_STATUS.UNAUDITED]: {
    label: STATUS_LABELS.UNAUDITED,
    color: 'warning',
    i18nKey: 'modules.status.unaudited',
  },
  [DOCUMENT_STATUS.PENDING_AUDIT]: {
    label: STATUS_LABELS.PENDING_AUDIT,
    color: 'warning',
    i18nKey: 'modules.status.pendingAudit',
  },
  [DOCUMENT_STATUS.AUDITED]: {
    label: STATUS_LABELS.AUDITED,
    color: 'success',
    i18nKey: 'modules.status.audited',
  },
  [DOCUMENT_STATUS.PENDING_APPROVAL]: {
    label: STATUS_LABELS.PENDING_APPROVAL,
    color: 'warning',
    i18nKey: 'modules.status.pendingApproval',
  },
  [DOCUMENT_STATUS.APPROVED]: {
    label: STATUS_LABELS.APPROVED,
    color: 'success',
    i18nKey: 'modules.status.approved',
  },
  [DOCUMENT_STATUS.DELIVERY_VERIFICATION]: {
    label: STATUS_LABELS.DELIVERY_VERIFICATION,
    color: 'processing',
    i18nKey: 'modules.status.deliveryVerification',
  },
  [DOCUMENT_STATUS.PENDING_CONFIRM]: {
    label: STATUS_LABELS.PENDING_CONFIRM,
    color: 'warning',
    i18nKey: 'modules.status.pendingConfirm',
  },
  [DOCUMENT_STATUS.CONFIRMED]: {
    label: STATUS_LABELS.CONFIRMED,
    color: 'success',
    i18nKey: 'modules.status.confirmed',
  },
  [DOCUMENT_STATUS.PURCHASE_COMPLETED]: {
    label: STATUS_LABELS.PURCHASE_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedPurchase',
  },
  [DOCUMENT_STATUS.SALES_COMPLETED]: {
    label: STATUS_LABELS.SALES_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedSales',
  },
  [DOCUMENT_STATUS.INBOUND_COMPLETED]: {
    label: STATUS_LABELS.INBOUND_COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completedInbound',
  },
  [DOCUMENT_STATUS.PARTIAL_INBOUND]: {
    label: STATUS_LABELS.PARTIAL_INBOUND,
    color: 'processing',
    i18nKey: 'modules.status.partialInbound',
  },
  [DOCUMENT_STATUS.PARTIAL_OUTBOUND]: {
    label: STATUS_LABELS.PARTIAL_OUTBOUND,
    color: 'processing',
    i18nKey: 'modules.status.partialOutbound',
  },
  [DOCUMENT_STATUS.COMPLETED]: {
    label: STATUS_LABELS.COMPLETED,
    color: 'cyan',
    i18nKey: 'modules.status.completed',
  },
  [DOCUMENT_STATUS.SIGNED]: {
    label: STATUS_LABELS.SIGNED,
    color: 'success',
    i18nKey: 'modules.status.signed',
  },
  [DOCUMENT_STATUS.UNSIGNED]: {
    label: STATUS_LABELS.UNSIGNED,
    color: 'warning',
    i18nKey: 'modules.status.unsigned',
  },
  [DOCUMENT_STATUS.EXECUTING]: {
    label: STATUS_LABELS.EXECUTING,
    color: 'processing',
    i18nKey: 'modules.status.executing',
  },
  [DOCUMENT_STATUS.RECEIVED]: {
    label: STATUS_LABELS.RECEIVED,
    color: 'success',
    i18nKey: 'modules.status.received',
  },
  [DOCUMENT_STATUS.PAID]: {
    label: STATUS_LABELS.PAID,
    color: 'success',
    i18nKey: 'modules.status.paid',
  },
  [DOCUMENT_STATUS.PARTIAL_SETTLED]: {
    label: STATUS_LABELS.PARTIAL_SETTLED,
    color: 'processing',
    i18nKey: 'modules.status.partialSettled',
  },
  [DOCUMENT_STATUS.ARCHIVED]: {
    label: STATUS_LABELS.ARCHIVED,
    color: 'success',
    i18nKey: 'modules.status.archived',
  },
  [DOCUMENT_STATUS.NORMAL]: {
    label: STATUS_LABELS.NORMAL,
    color: 'success',
    i18nKey: 'modules.status.normal',
  },
  [DOCUMENT_STATUS.DISABLED]: {
    label: STATUS_LABELS.DISABLED,
    color: 'error',
    i18nKey: 'modules.status.disabled',
  },
  [DOCUMENT_STATUS.SUCCESS]: {
    label: STATUS_LABELS.SUCCESS,
    color: 'success',
    i18nKey: 'modules.status.success',
  },
  [DOCUMENT_STATUS.FAILED]: {
    label: STATUS_LABELS.FAILED,
    color: 'error',
    i18nKey: 'modules.status.failed',
  },
  [DOCUMENT_STATUS.DELETED]: {
    label: STATUS_LABELS.DELETED,
    color: 'error',
    i18nKey: 'modules.status.deleted',
  },
} as const satisfies Record<string, DocumentStatusMeta>

export type DocumentStatusCode = keyof typeof DOCUMENT_STATUS_REGISTRY

const FALLBACK_STATUS_COLOR: StatusColor = 'default'

/** 判断给定状态 code 是否已在注册表中登记。 */
export function isKnownStatus(status: string): status is DocumentStatusCode {
  return Object.hasOwn(DOCUMENT_STATUS_REGISTRY, status)
}

/** 获取状态颜色，未知状态回退为 `default`，不抛错。 */
export function getStatusColor(status: string): StatusColor {
  return isKnownStatus(status)
    ? DOCUMENT_STATUS_REGISTRY[status].color
    : FALLBACK_STATUS_COLOR
}

/**
 * 获取状态文案的 i18n key（未知状态返回 null，由调用方决定回退）。
 *
 * <p>审核确认框需要把「从什么状态 → 审到什么状态」说清楚，而状态文案本身只在
 * `DOCUMENT_STATUS_REGISTRY` 里登记了一次。这里导出 key 而不是拼好的字符串，
 * 是为了让调用方用自己的 `t()`（带当前语言）翻译，而不是在常量层写死某一种语言。</p>
 */
export function getStatusI18nKey(status: string): string | null {
  return isKnownStatus(status) ? DOCUMENT_STATUS_REGISTRY[status].i18nKey : null
}

/**
 * 状态 code → 当前语言下的展示文案（展示层的唯一出口）。
 *
 * <p>已登记状态走注册表 i18nKey（与列表 Tag、筛选下拉共用同一份文案）；
 * 未登记状态回退到 `statusLabel`（中文表），再回退原值 —— 绝不把新状态显示成空白
 * 或被静默当成某个已知状态。用于"直接渲染 `record.status`"的场景：
 * 迁移后该字段是 code，直接渲染会把 `DRAFT` 摆到用户脸上。</p>
 */
export function getStatusText(
  status: string | null | undefined,
  translate: (key: string) => string,
): string {
  const code = status == null ? '' : String(status).trim()
  if (!code) {
    return ''
  }
  const key = getStatusI18nKey(code)
  return key ? translate(key) : statusLabel(code)
}
