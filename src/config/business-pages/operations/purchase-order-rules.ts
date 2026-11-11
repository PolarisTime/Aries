import { Tag, Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
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

/**
 * 采购订单「订单编号」列：只渲染单号本身（外层类名供单据流弹层触发使用）。
 *
 * <p>原先在单号后追加下游引用状态图标（已被销售订单/采购入库引用），按产品要求整体下线：
 * 图标与 tooltip 都不再渲染；行级字段 `referencedBySalesOrder` / `referencedByPurchaseInbound`
 * 也随后端 DTO 一并从响应 schema 删除（前端已无消费方）。</p>
 */
export function renderPurchaseOrderNo(value: unknown): React.ReactNode {
  return React.createElement(
    'span',
    { className: 'document-reference-trigger' },
    React.createElement(
      'span',
      { className: 'document-reference-link' },
      String(value ?? ''),
    ),
  )
}

export function buildPurchaseOrderOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

/**
 * 「金额」列：**暂定与实际是互斥的两个状态**，一列按状态显示其一。
 *
 * <p>未入库/未过磅时后端 `totalActualAmount` 为 null（见 `PurchaseOrderResponse.applyDifference`），
 * 此时列表展示「总金额」（按暂定件重计，用于打款）并挂橙色「暂定」标签；
 * 一旦过磅，`totalActualAmount` 有值，该值就是结算口径，直接显示它、不再挂暂定标签。</p>
 *
 * <p>此前是两列并列：总金额**永远**带「暂定」标签（即使已结算），实际货值单独一列，
 * 同一行看起来既暂定又实际，语义自相矛盾，还多占约 110px 宽度。合并后保留 tooltip
 * 让用户仍能看到两个口径的原始数字。</p>
 */
export function renderPurchaseOrderAmount(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  const actualAmount = toFiniteOrNull(record.totalActualAmount)
  const provisionalAmount = toFiniteOrNull(value)
  if (actualAmount !== null) {
    return React.createElement(
      'span',
      {
        className: 'purchase-order-actual-amount',
        title:
          provisionalAmount === null
            ? undefined
            : i18next.t('modules.pages.purchaseOrder.colAmountHint', {
                provisional: formatAmount(provisionalAmount),
                actual: formatAmount(actualAmount),
              }),
      },
      formatAmount(actualAmount),
    )
  }
  if (provisionalAmount === null) {
    return '-'
  }
  return React.createElement(
    'span',
    { className: 'purchase-order-provisional-amount' },
    formatAmount(provisionalAmount),
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
  /*
   * 未收满时把「还剩 N / 共 M」写进同一格：剩余件数原先是独立一列（未入库），
   * 但它是「总件数 − 已入库」的减法结果，同一口径两个出口；合并后省 96px，
   * 且用户不必再自己相减。
   */
  const detail = i18next.t('modules.pages.purchaseOrder.receiptProgressValue', {
    received: receivedQuantity,
    total: totalQuantity,
  })
  const remainingHint = i18next.t(
    'modules.pages.purchaseOrder.receiptProgressRemaining',
    { count: remainingQuantity },
  )
  return React.createElement(
    Tag,
    { color, title: detail },
    `${statusLabel} · ${remainingHint}`,
  )
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
