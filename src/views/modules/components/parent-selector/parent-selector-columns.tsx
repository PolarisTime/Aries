import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import i18next from 'i18next'
import {
  formatDocumentReferenceText,
  isDocumentReferenceField,
} from '@/components/document-reference/document-reference-utils'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import {
  DETAIL_TOGGLE_COLUMN_ID,
  DETAIL_TOGGLE_COLUMN_WIDTH,
} from '@/hooks/useGridColumns'
import { getDisplayStatus } from '@/module-system/record/module-record-deletion'
import type {
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { resolveVisibleParentSelectorColumns } from '../module-parent-selector-utils'
import type {
  ParentSelectorFormatCellValue,
  ParentSelectorTranslator,
} from './parent-selector-mode'

export type OverlayColumn = {
  dataIndex: string
  title: string
  width?: number
  type?: 'date' | 'amount' | 'weight' | 'status'
}

/** 选单器主表日期展示：X年M月D日，月/日不足两位补零。 */
export function formatCnDate(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return formatCellValueDateFallback(value)
  }
  const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (!match) {
    return formatCellValueDateFallback(value)
  }
  const [, year, month, day] = match
  return `${year}年${month.padStart(2, '0')}月${day.padStart(2, '0')}日`
}

export function formatCellValueDateFallback(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value)
}

export function getParentSelectorColumnMap(): Record<string, OverlayColumn[]> {
  return {
    'purchase-order': [
      {
        dataIndex: 'orderNo',
        title: i18next.t('modules.parentSelector.column.orderNo'),
        width: 160,
      },
      {
        dataIndex: 'supplierName',
        title: i18next.t('modules.parentSelector.column.supplierName'),
        width: 180,
      },
      {
        dataIndex: 'buyerName',
        title: i18next.t('modules.parentSelector.column.buyerName'),
        width: 120,
      },
      {
        dataIndex: 'orderDate',
        title: i18next.t('modules.parentSelector.column.orderDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'sales-order': [
      {
        dataIndex: 'orderNo',
        title: i18next.t('modules.parentSelector.column.orderNo'),
        width: 160,
      },
      {
        dataIndex: 'purchaseOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedPurchaseOrder'),
        width: 180,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'deliveryDate',
        title: i18next.t('modules.parentSelector.column.deliveryDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'sales-outbound': [
      {
        dataIndex: 'outboundNo',
        title: i18next.t('modules.parentSelector.column.outboundNo'),
        width: 160,
      },
      {
        dataIndex: 'salesOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedOrder'),
        width: 160,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'outboundDate',
        title: i18next.t('modules.parentSelector.column.outboundDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'freight-bill': [
      {
        dataIndex: 'billNo',
        title: i18next.t('modules.filter.freightNo'),
        width: 160,
      },
      {
        dataIndex: 'carrierName',
        title: i18next.t('modules.filter.carrierName'),
        width: 150,
      },
      {
        dataIndex: 'customerName',
        title: i18next.t('modules.parentSelector.column.customerName'),
        width: 160,
      },
      {
        dataIndex: 'projectName',
        title: i18next.t('modules.parentSelector.column.projectName'),
        width: 180,
      },
      {
        dataIndex: 'billTime',
        title: i18next.t('modules.parentSelector.summary.billTime'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalFreight',
        title: i18next.t('modules.pages.freightStatement.totalFreight'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
    'purchase-inbound': [
      {
        dataIndex: 'inboundNo',
        title: i18next.t('modules.parentSelector.column.inboundNo'),
        width: 160,
      },
      {
        dataIndex: 'purchaseOrderNo',
        title: i18next.t('modules.parentSelector.column.relatedOrder'),
        width: 160,
      },
      {
        dataIndex: 'supplierName',
        title: i18next.t('modules.parentSelector.column.supplierName'),
        width: 180,
      },
      {
        dataIndex: 'inboundDate',
        title: i18next.t('modules.parentSelector.column.inboundDate'),
        width: 130,
        type: 'date',
      },
      {
        dataIndex: 'totalWeight',
        title: i18next.t('modules.parentSelector.column.totalWeight'),
        width: 130,
        type: 'weight',
      },
      {
        dataIndex: 'totalAmount',
        title: i18next.t('modules.parentSelector.column.totalAmount'),
        width: 120,
        type: 'amount',
      },
      {
        dataIndex: 'status',
        title: i18next.t('modules.parentSelector.column.status'),
        width: 110,
        type: 'status',
      },
    ],
  }
}

export function resolveParentSelectorColumns(
  parentModuleKey: string,
  displayFieldKey: string,
): OverlayColumn[] {
  const configuredColumns = getParentSelectorColumnMap()[parentModuleKey]
  if (configuredColumns?.length) {
    return configuredColumns
  }
  return [
    {
      dataIndex: displayFieldKey,
      title: i18next.t('modules.parentSelector.column.docNo'),
      width: 180,
    },
    {
      dataIndex: 'status',
      title: i18next.t('modules.parentSelector.column.status'),
      width: 110,
      type: 'status',
    },
  ]
}

export function buildParentSelectorDataColumns({
  parentModuleKey,
  displayFieldKey,
  hiddenSelectorColumnKeys,
  formatCellValue,
}: {
  parentModuleKey: string
  displayFieldKey: string
  hiddenSelectorColumnKeys?: ModuleParentImportDefinition['hiddenSelectorColumnKeys']
  formatCellValue: ParentSelectorFormatCellValue
}): ColumnsType<ModuleRecord> {
  return resolveVisibleParentSelectorColumns(
    resolveParentSelectorColumns(parentModuleKey, displayFieldKey),
    hiddenSelectorColumnKeys,
  ).map((column) => ({
    dataIndex: column.dataIndex,
    title: column.title,
    width: column.width,
    ellipsis: true,
    align:
      column.type === 'amount' || column.type === 'weight' ? 'right' : 'center',
    render: (value: unknown, record: ModuleRecord) => {
      if (column.type === 'status') {
        const status = getDisplayStatus(record, column.dataIndex)
        return (
          <StatusTag status={status} statusMap={statusMap} fallback={status} />
        )
      }
      if (isDocumentReferenceField(column.dataIndex)) {
        /*
         * 选单弹层只需要单号本身：行内复制与「单据流转」两个图标会让勾选行变拥挤，
         * 也容易在点行勾选时误触跳转。文本口径统一取 `formatDocumentReferenceText`
         * （唯一出口），列的 ellipsis 会把全文写进 title，需要时仍可悬停查看。
         */
        return formatDocumentReferenceText(value) || '-'
      }
      if (column.type === 'date') {
        return formatCnDate(value)
      }
      return formatCellValue(value, column.type)
    },
  }))
}

export function buildParentSelectorDetailToggleColumn({
  detailExpandedRowKeys,
  toggleDetail,
  t,
}: {
  detailExpandedRowKeys: string[]
  toggleDetail: (record: ModuleRecord) => void
  t: ParentSelectorTranslator
}): ColumnsType<ModuleRecord>[number] {
  return {
    key: DETAIL_TOGGLE_COLUMN_ID,
    title: '',
    width: DETAIL_TOGGLE_COLUMN_WIDTH,
    fixed: 'left',
    render: (_: unknown, record: ModuleRecord) => {
      const expanded = detailExpandedRowKeys.includes(String(record.id))
      const label = expanded
        ? t('modules.parentSelector.collapseDetail')
        : t('modules.parentSelector.expandDetail')
      return (
        <Tooltip title={label}>
          <Button
            aria-label={label}
            aria-expanded={expanded}
            className={`table-detail-toggle-btn parent-selector-detail-toggle-btn${
              expanded ? ' is-active' : ''
            }`}
            icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
            onClick={(event) => {
              event.stopPropagation()
              toggleDetail(record)
            }}
            size="small"
            type="text"
          />
        </Tooltip>
      )
    },
  }
}
