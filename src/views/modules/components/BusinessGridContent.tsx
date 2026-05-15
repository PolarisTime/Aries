import Alert from 'antd/es/alert'
import Card from 'antd/es/card'
import type { ColumnsType, TableProps } from 'antd/es/table'
import type { SortOrder } from 'antd/es/table/interface'
import { useEffect, useState } from 'react'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  filters: SearchParams
  loading: boolean
  exporting: boolean
  records: ModuleRecord[]
  hasMore: boolean
  loadMore: () => void
  isFetching: boolean
  warningMessage: string
  columnVisibleKeys: string[]
  columnOrder: string[]
  columns: ColumnsType<ModuleRecord>
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onUpdateFilter: (key: string, value: unknown) => void
  onSearch: () => void
  onReset: () => void
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onToggleColumn: (key: string) => void
  onColumnOrderChange: (order: string[]) => void
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  canCreate: boolean
  canExport: boolean
  toolbarActions: ModuleActionDefinition[]
  onAction: (action: ModuleActionDefinition) => void
  onSortingChange: (columnKey?: string | number, order?: SortOrder) => void
}

export function BusinessGridContent({
  moduleKey,
  config,
  filters,
  loading,
  exporting,
  records,
  hasMore,
  loadMore,
  isFetching,
  warningMessage,
  columnVisibleKeys,
  columnOrder,
  columns,
  rowSelection,
  rowClassName,
  onUpdateFilter,
  onSearch,
  onReset,
  onCreate,
  onExport,
  onRefresh,
  onToggleColumn,
  onColumnOrderChange,
  onRowClick,
  onRowDoubleClick,
  canCreate,
  canExport,
  toolbarActions,
  onAction,
  onSortingChange,
}: Props) {
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)

  useEffect(() => {
    setColumnSettingsOpen(false)
  }, [])

  return (
    <Card className="module-grid-card">
      <ModuleFilterToolbar
        config={config}
        filters={filters}
        onUpdateFilter={onUpdateFilter}
        onSearch={onSearch}
        onReset={onReset}
      />

      <ModuleTableToolbar
        canCreate={canCreate}
        canExport={canExport}
        total={records.length}
        loading={loading}
        exporting={exporting}
        onCreate={onCreate}
        onExport={onExport}
        onRefresh={onRefresh}
        toolbarActions={toolbarActions}
        onAction={onAction}
        extra={
          <ColumnSettingsPopover
            columns={config.columns}
            orderedKeys={columnOrder}
            visibleKeys={columnVisibleKeys}
            onToggle={onToggleColumn}
            onOrderChange={onColumnOrderChange}
            open={columnSettingsOpen}
            onOpenChange={setColumnSettingsOpen}
          />
        }
      />

      {warningMessage ? (
        <Alert
          type="warning"
          showIcon
          title={warningMessage}
          className="mb-4"
        />
      ) : null}

      <BusinessGridTable
        key={moduleKey}
        moduleKey={moduleKey}
        columns={columns}
        dataSource={records}
        loading={loading}
        rowSelection={rowSelection}
        rowClassName={rowClassName}
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        hasMore={hasMore}
        loadMore={loadMore}
        isFetching={isFetching}
        onSortingChange={onSortingChange}
      />
    </Card>
  )
}
