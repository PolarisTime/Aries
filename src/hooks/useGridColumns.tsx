import type { ColumnDef } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import { type ActionItem, TableActions } from '@/components/TableActions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    width?: string
    align?: string
    fixed?: string
    ellipsis?: string
    renderCell?: (record: ModuleRecord) => ReactNode
  }
}

interface Props {
  config: ModulePageConfig
  rowActions: (record: ModuleRecord) => ActionItem[]
  canUpdate: boolean
  showActions?: boolean
}

export function useGridColumns({
  config,
  rowActions,
  canUpdate,
  showActions,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const { t } = useTranslation()

  const columns: ColumnDef<ModuleRecord>[] = []

  if (canUpdate || showActions) {
    columns.push({
      id: 'actions',
      header: t('hooks.gridColumns.actions'),
      meta: {
        width: '240px',
        align: 'center',
        fixed: 'left',
        renderCell: (record: ModuleRecord) => (
          <TableActions items={rowActions(record)} />
        ),
      },
      cell: ({ row }) => <TableActions items={rowActions(row.original)} />,
    })
  }

  for (const colDef of config.columns) {
    columns.push({
      id: colDef.dataIndex,
      header: colDef.title,
      accessorKey: colDef.dataIndex,
      meta: {
        width: colDef.width ? `${colDef.width}px` : '120px',
        align: colDef.align || 'center',
        renderCell: (record: ModuleRecord) => {
          const value = record[colDef.dataIndex]
          if (colDef.render) {
            return colDef.render(value, record)
          }
          if (colDef.type === 'status' && config.statusMap) {
            const statusStr = asString(value)
            return <StatusTag status={statusStr} statusMap={config.statusMap} />
          }
          return <span>{formatCellValue(value, colDef.type)}</span>
        },
      },
      cell: ({ getValue, row }) => {
        const value = getValue()
        if (colDef.render) {
          return colDef.render(value, row.original)
        }
        if (colDef.type === 'status' && config.statusMap) {
          const statusStr = asString(value)
          return <StatusTag status={statusStr} statusMap={config.statusMap} />
        }
        return <span>{formatCellValue(value, colDef.type)}</span>
      },
    })
  }

  return { columns }
}
