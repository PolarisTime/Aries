import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { StatusTag } from '@/components/StatusTag'
import { TableActions, type ActionItem } from '@/components/TableActions'
import type { ModuleRecord, ModulePageConfig } from '@/types/module-page'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    width?: string
    align?: string
    fixed?: string
    ellipsis?: string
  }
}

interface Props {
  config: ModulePageConfig
  rowActions: (record: ModuleRecord) => ActionItem[]
  canUpdate: boolean
}

export function useGridColumns({
  config,
  rowActions,
  canUpdate,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()

  const columns = useMemo((): ColumnDef<ModuleRecord>[] => {
    const cols: ColumnDef<ModuleRecord>[] = []

    for (const colDef of config.columns) {
      cols.push({
        id: colDef.dataIndex,
        header: colDef.title,
        accessorKey: colDef.dataIndex,
        meta: {
          width: colDef.width ? `${colDef.width}px` : undefined,
          align: colDef.align || 'center',
        },
        cell: ({ getValue }) => {
          const value = getValue()
          if (colDef.type === 'status' && config.statusMap) {
            const statusStr = String(value || '')
            return <StatusTag status={statusStr} statusMap={config.statusMap} />
          }
          return <span>{formatCellValue(value, colDef.type)}</span>
        },
      })
    }

    if (canUpdate) {
      cols.push({
        id: 'actions',
        header: '操作',
        meta: { width: '180px', align: 'center', fixed: 'right' },
        cell: ({ row }) => <TableActions items={rowActions(row.original)} />,
      })
    }

    return cols
  }, [config, rowActions, canUpdate, formatCellValue])

  return { columns }
}
