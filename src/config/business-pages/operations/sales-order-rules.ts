import { Tooltip } from 'antd'
import i18next from 'i18next'
import React from 'react'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'
import {
  DISPLAY_WEIGHT_PRECISION,
  INTERNAL_WEIGHT_PRECISION,
} from '@/constants/precision'
import type { ModuleRecord, ModuleRecordInput } from '@/types/module-page'
import { buildAmountWeightOverview, cloneLineItems } from '../shared/shared'

export function renderSalesOrderNo(
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
          key: 'freight-bill',
          label: i18next.t('modules.pages.salesOrder.referencedByFreightBill'),
          referenced: Boolean(record.referencedByFreightBill),
        },
        {
          key: 'sales-outbound',
          label: i18next.t(
            'modules.pages.salesOrder.referencedBySalesOutbound',
          ),
          referenced: Boolean(record.referencedBySalesOutbound),
        },
      ],
    }),
  )
}

export function formatWeightDisplay(value: unknown): string {
  const n = Number(value)
  return Number.isFinite(n)
    ? n.toFixed(DISPLAY_WEIGHT_PRECISION).replace(/\.?0+$/, '')
    : '-'
}

export function hasOverwrittenOriginalWeight(
  items: ModuleRecord['items'],
): boolean {
  return (items || []).some(
    (item: Record<string, unknown>) =>
      item.originalWeightTon != null &&
      Number(item.originalWeightTon) !== Number(item.weightTon),
  )
}

export function sumOriginalWeightTon(items: ModuleRecord['items']): number {
  return ((items as Record<string, unknown>[] | undefined) ?? []).reduce(
    (sum, item) => sum + Number(item.originalWeightTon || 0),
    0,
  )
}

export function renderSalesOrderTotalWeight(
  value: unknown,
  record: ModuleRecord,
): React.ReactNode {
  const fmt = formatWeightDisplay
  if (!hasOverwrittenOriginalWeight(record.items)) return fmt(value)
  const original = sumOriginalWeightTon(record.items)
  return React.createElement(
    Tooltip,
    {
      title: `原始计划 ${fmt(original)} 吨`,
    },
    `${fmt(value)} ⚠️`,
  )
}

export function buildSalesOrderOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export function buildSalesOrderParentFilters(
  currentRecord: ModuleRecordInput,
): Record<string, unknown> {
  return {
    currentSalesOrderId: currentRecord.id,
  }
}

export function mapPurchaseInboundToSalesOrderDraft(
  parentRecord: ModuleRecord,
): Partial<ModuleRecord> {
  return {
    purchaseOrderNo: parentRecord.purchaseOrderNo || parentRecord.orderNo || '',
    purchaseInboundNo: [
      ...new Set(
        (Array.isArray(parentRecord.items) ? parentRecord.items : []).flatMap(
          (item) => {
            const value =
              typeof item.inboundNo === 'string' ? item.inboundNo.trim() : ''
            return value ? [value] : []
          },
        ),
      ),
    ].join(', '),
  }
}

export function transformPurchaseInboundItemsToSalesOrderItems(
  parentRecord: ModuleRecord,
) {
  return cloneLineItems(
    Array.isArray(parentRecord.items)
      ? parentRecord.items.map((item) => {
          const rawRemainingQuantity = Number(
            item.remainingQuantity ??
              item.salesRemainingQuantity ??
              item.quantity ??
              0,
          )
          const rawTotalQuantity = Number(item.quantity || 0)
          const rawTotalWeightTon = Number(item.weightTon || 0)
          const rawRemainingWeightTon = Number(
            item.salesRemainingWeightTon ?? 0,
          )
          const rawPieceWeightTon = Number(item.pieceWeightTon || 0)
          const rawUnitPrice = Number(item.unitPrice || 0)
          const remainingQuantity = Number.isFinite(rawRemainingQuantity)
            ? rawRemainingQuantity
            : 0
          const pieceWeightTon = Number.isFinite(rawPieceWeightTon)
            ? rawPieceWeightTon
            : 0
          const unitPrice = Number.isFinite(rawUnitPrice) ? rawUnitPrice : 0
          const remainingWeightTon =
            rawRemainingWeightTon > 0
              ? Number(rawRemainingWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION))
              : rawTotalQuantity > 0 &&
                  rawTotalWeightTon > 0 &&
                  remainingQuantity === rawTotalQuantity
                ? Number(rawTotalWeightTon.toFixed(INTERNAL_WEIGHT_PRECISION))
                : Number(
                    (remainingQuantity * pieceWeightTon).toFixed(
                      INTERNAL_WEIGHT_PRECISION,
                    ),
                  )
          return {
            ...item,
            sourceInboundItemId: item.sourceInboundItemId ?? item.id,
            sourcePurchaseOrderItemId: undefined,
            pieceWeightTon,
            remainingQuantity,
            remainingWeightTon,
            remainingAmount: Number(
              (remainingWeightTon * unitPrice).toFixed(2),
            ),
            _sourceTotalQuantity: item.quantity,
            _sourceTotalWeightTon: item.weightTon,
            _sourcePieceWeightTon: item.pieceWeightTon,
          }
        })
      : [],
    'sales-order-item',
  )
}
