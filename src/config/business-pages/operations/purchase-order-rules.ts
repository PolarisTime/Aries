import { Tag, Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModuleRecord } from '@/types/module-page'
import { formatAmount, formatDateTime, formatWeight } from '@/utils/formatters'
import { buildAmountWeightOverview } from '../shared/shared'

function toFiniteOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export function renderPurchaseOrderNo(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  return React.createElement(
    'span',
    { className: 'document-reference-trigger' },
    React.createElement(
      'span',
      { className: 'document-reference-link' },
      String(value ?? ''),
    ),
    React.createElement(DocumentReferenceStatusIcons, {
      statuses: [
        {
          key: 'sales-order',
          label: i18next.t(
            'modules.pages.purchaseOrder.referencedBySalesOrder',
          ),
          referenced: Boolean(record.referencedBySalesOrder),
        },
        {
          key: 'purchase-inbound',
          label: i18next.t(
            'modules.pages.purchaseOrder.referencedByPurchaseInbound',
          ),
          referenced: Boolean(record.referencedByPurchaseInbound),
        },
      ],
    }),
  )
}

export function buildPurchaseOrderOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

/** 「总金额」列：暂定金额（按暂定件重计）后附「暂定」标签，说明该金额用于打款。 */
export function renderPurchaseOrderTotalAmount(
  value: unknown,
): React.ReactNode {
  const numericValue = toFiniteOrNull(value)
  const amount = numericValue === null ? '-' : formatAmount(numericValue)
  return React.createElement(
    'span',
    { className: 'purchase-order-provisional-amount' },
    amount,
    React.createElement(
      Tag,
      {
        color: 'orange',
        className: 'purchase-order-provisional-amount-tag',
        title: i18next.t('modules.pages.purchaseOrder.provisionalAmountHint'),
      },
      i18next.t('modules.pages.purchaseOrder.provisionalAmountTag'),
    ),
  )
}

/** 「实际货值」列：过磅实际重×单价汇总，空值兜底为短横线。 */
export function renderPurchaseOrderActualAmount(
  value: unknown,
): React.ReactNode {
  const numericValue = toFiniteOrNull(value)
  return numericValue === null ? '-' : formatAmount(numericValue)
}

/** 「差额」列：正数=需补款（红），负数=需退款（绿），零/空=不显示标识。 */
export function renderPurchaseOrderAmountDifference(
  value: unknown,
): React.ReactNode {
  const numericValue = toFiniteOrNull(value)
  if (numericValue === null) {
    return '-'
  }
  const amount = formatAmount(Math.abs(numericValue))
  if (numericValue > 0) {
    return React.createElement(
      Tag,
      { color: 'red' },
      `${i18next.t('modules.pages.purchaseOrder.amountDifferencePay')} ${amount}`,
    )
  }
  if (numericValue < 0) {
    return React.createElement(
      Tag,
      { color: 'green' },
      `${i18next.t('modules.pages.purchaseOrder.amountDifferenceRefund')} ${amount}`,
    )
  }
  return amount
}

/**
 * 「入库进度」列：基于已入库件数与未入库件数推导 未入库/部分入库/已全部入库。
 *
 * <p>收满时只给状态（「已全部入库」已含收满之意），不再重复 "已入库 N / N"；未入库与部分入库
 * 保留件数，便于一眼看出进度。</p>
 *
 * <p>强制结单的订单单独标记：剩余件数是人工作废的，不能与"收满自动完成"混为一谈；
 * 悬浮说明给出作废件数、操作人、时间与原因。</p>
 */
export function renderPurchaseOrderReceiptProgress(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  const received = toFiniteOrNull(value)
  const remaining = toFiniteOrNull(record.totalRemainingQuantity)
  if (received === null && remaining === null) {
    return '-'
  }
  const receivedQuantity = Math.max(received ?? 0, 0)
  const remainingQuantity = Math.max(remaining ?? 0, 0)
  const totalQuantity = receivedQuantity + remainingQuantity
  const forceClose = resolveForceCloseHint(record)
  if (forceClose) {
    return React.createElement(
      Tooltip,
      { title: forceClose },
      React.createElement(
        Tag,
        { color: 'purple' },
        i18next.t('modules.purchaseForceClose.tag'),
      ),
    )
  }
  const done = remainingQuantity === 0
  const notStarted = receivedQuantity === 0
  const color = done ? 'green' : notStarted ? 'default' : 'processing'
  const statusKey = done
    ? 'receiptProgressDone'
    : notStarted
      ? 'receiptProgressNotStarted'
      : 'receiptProgressPartial'
  const statusLabel = i18next.t(`modules.pages.purchaseOrder.${statusKey}`)
  if (done) {
    return React.createElement(Tag, { color }, statusLabel)
  }
  const detail = i18next.t('modules.pages.purchaseOrder.receiptProgressValue', {
    received: receivedQuantity,
    total: totalQuantity,
  })
  return React.createElement(Tag, { color }, `${statusLabel} ${detail}`)
}

/** 强制结单悬浮说明；非强制结单返回 null。 */
function resolveForceCloseHint(record: ModuleRecord): string | null {
  const forceClose = record.forceClose
  if (!forceClose || typeof forceClose !== 'object') {
    return null
  }
  const detail = forceClose as {
    reason?: unknown
    remainingQuantity?: unknown
    operatorName?: unknown
    closedAt?: unknown
  }
  const reason = String(detail.reason ?? '').trim()
  const operatorName = String(detail.operatorName ?? '').trim()
  const closedAt =
    detail.closedAt === null || detail.closedAt === undefined
      ? ''
      : formatDateTime(detail.closedAt)
  const count = toFiniteOrNull(detail.remainingQuantity)
  if (count === null) {
    return i18next.t('modules.purchaseForceClose.tagHintNoCount')
  }
  return i18next.t('modules.purchaseForceClose.tagHint', {
    count,
    operator: operatorName || '—',
    time: closedAt || '—',
    reason: reason || '—',
  })
}

/** 明细「磅差(吨)」派生列：actualWeightTon − weightTon，在 render 中计算。 */
export function renderPurchaseOrderWeightVariance(
  _value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  const actualWeight = toFiniteOrNull(record.actualWeightTon)
  const plannedWeight = toFiniteOrNull(record.weightTon)
  if (actualWeight === null || plannedWeight === null) {
    return '-'
  }
  const variance = Number(
    (actualWeight - plannedWeight).toFixed(DISPLAY_WEIGHT_PRECISION),
  )
  return formatWeight(variance)
}
