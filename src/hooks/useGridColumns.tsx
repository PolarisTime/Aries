import { EyeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import { Button, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentReferencePopover } from '@/components/DocumentReferencePopover'
import { isListDocumentReferenceField } from '@/components/document-reference/document-reference-utils'
import { renderModuleRecordStatus } from '@/components/ModuleRecordStatus'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const DETAIL_TOGGLE_COLUMN_ID = 'detail-toggle'
export const DETAIL_TOGGLE_COLUMN_WIDTH = 48

/** 明细按钮的形态：加号/减号（可展开）或眼睛（打开独立详情）。 */
export type DetailToggleVariant = 'expand' | 'preview'

function resolveSummaryAmount(record: ModuleRecord) {
  const amount =
    record.amount ??
    record.totalAmount ??
    record.closingAmount ??
    record.totalFreight
  return typeof amount === 'number' || typeof amount === 'string'
    ? amount
    : undefined
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    width?: number | string
    align?: string
    fixed?: string
    ellipsis?: string
    renderCell?: (record: ModuleRecord) => ReactNode
  }
}

interface Props {
  config: ModulePageConfig
  onOpenDetail?: (record: ModuleRecord) => void
  /**
   * 内联展开的行 key 集合；提供时明细按钮渲染加号/减号并体现展开态，
   * 缺省时沿用眼睛图标（打开独立详情浮层）。
   */
  expandedRowKeys?: string[]
  variant?: DetailToggleVariant
}

export function useGridColumns({
  config,
  onOpenDetail,
  expandedRowKeys,
  variant,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const { t } = useTranslation()

  const columns: ColumnDef<StockFeatures, ModuleRecord>[] = []

  for (const colDef of config.columns) {
    columns.push({
      id: colDef.dataIndex,
      header: colDef.title,
      accessorKey: colDef.dataIndex,
      meta: {
        width: colDef.width ? `${colDef.width}px` : '120px',
        align: 'center',
        renderCell: (record: ModuleRecord) => {
          const value = record[colDef.dataIndex]
          if (colDef.type === 'status') {
            return renderModuleRecordStatus({
              record,
              statusKey: colDef.dataIndex,
              statusMap: config.statusMap,
              renderFallback: (status) => (
                <span>{formatCellValue(status, colDef.type)}</span>
              ),
            })
          }
          if (
            isListDocumentReferenceField(colDef.dataIndex, config.primaryNoKey)
          ) {
            return (
              <DocumentReferencePopover
                value={value}
                fieldKey={colDef.dataIndex}
                moduleKey={config.key}
                contextModuleKey={config.key}
                documentLabel={colDef.title}
                summary={{
                  counterpartyName:
                    asString(record.counterpartyName) ||
                    asString(record.customerName) ||
                    asString(record.supplierName) ||
                    asString(record.carrierName),
                  amount: resolveSummaryAmount(record),
                  status: asString(record.status),
                }}
                statusMap={config.statusMap}
              />
            )
          }
          if (colDef.render) {
            return colDef.render(value, record)
          }
          return <span>{formatCellValue(value, colDef.type)}</span>
        },
      },
    })
  }

  if (onOpenDetail) {
    const useExpandVariant =
      variant === 'expand' || (variant === undefined && expandedRowKeys != null)
    columns.push({
      id: DETAIL_TOGGLE_COLUMN_ID,
      header: '',
      meta: {
        width: DETAIL_TOGGLE_COLUMN_WIDTH,
        align: 'center',
        renderCell: (record: ModuleRecord) => {
          const expanded = Boolean(expandedRowKeys?.includes(String(record.id)))
          const label = useExpandVariant
            ? expanded
              ? t('modules.parentSelector.collapseDetail')
              : t('modules.parentSelector.expandDetail')
            : t('hooks.gridColumns.detail')
          return (
            <Tooltip title={label}>
              <Button
                aria-label={label}
                aria-expanded={useExpandVariant ? expanded : undefined}
                className={`table-detail-toggle-btn${
                  expanded ? ' is-active' : ''
                }`}
                icon={
                  useExpandVariant ? (
                    expanded ? (
                      <MinusOutlined />
                    ) : (
                      <PlusOutlined />
                    )
                  ) : (
                    <EyeOutlined />
                  )
                }
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenDetail(record)
                }}
                size="small"
                type="text"
              />
            </Tooltip>
          )
        },
      },
      cell: () => null,
    })
  }

  /*
   * 行级动作只保留行右键菜单(与触摸长按)一个入口, 不再渲染行尾「更多」操作列:
   * 列宽固定 200px 却只放一个 32px 图标按钮, 既浪费横向空间, 又让「列设置」里
   * 多出一个无法隐藏/移动的伪列。行菜单与键盘/触摸入口见 RowContextMenuRow。
   */

  return { columns }
}
