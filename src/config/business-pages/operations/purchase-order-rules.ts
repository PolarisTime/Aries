import i18next from 'i18next'
import React from 'react'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'
import type { ModuleRecord } from '@/types/module-page'
import { buildAmountWeightOverview } from '../shared/shared'

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
      ],
    }),
  )
}

export function buildPurchaseOrderOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}
