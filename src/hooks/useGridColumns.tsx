import { EyeOutlined } from '@ant-design/icons'
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
}

export function useGridColumns({ config, onOpenDetail }: Props) {
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
    columns.push({
      id: DETAIL_TOGGLE_COLUMN_ID,
      header: '',
      meta: {
        width: DETAIL_TOGGLE_COLUMN_WIDTH,
        align: 'center',
        renderCell: (record: ModuleRecord) => (
          <Tooltip title={t('hooks.gridColumns.detail')}>
            <Button
              aria-label={t('hooks.gridColumns.detail')}
              className="table-detail-toggle-btn"
              icon={<EyeOutlined />}
              onClick={(event) => {
                event.stopPropagation()
                onOpenDetail(record)
              }}
              size="small"
              type="text"
            />
          </Tooltip>
        ),
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
