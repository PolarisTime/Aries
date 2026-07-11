import { Alert } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { useState } from 'react'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'
import { BusinessGridWorkspaceHeader } from '@/views/modules/components/BusinessGridWorkspaceHeader'
import { ColumnSettingsPopover } from '@/views/modules/components/ColumnSettingsPopover'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { ModuleTableToolbar } from '@/views/modules/components/ModuleTableToolbar'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  filters: SearchParams
  defaultFilters: SearchParams
  submittedFilters: SearchParams
  loading: boolean
  exporting: boolean
  records: ModuleRecord[]
  selectedRows: ModuleRecord[]
  total: number
  currentPage: number
  pageSize: number
  warningMessage: string
  columnVisibleKeys: string[]
  columnOrder: string[]
  columns: ColumnsType<ModuleRecord>
  rowSelection?: TableProps<ModuleRecord>['rowSelection']
  rowClassName: (record: ModuleRecord) => string
  onUpdateFilter: (key: string, value: unknown) => void
  onApplyFilters: (filters: SearchParams) => void
  onReset: () => void
  onCreate: () => void
  onExport: () => void
  onRefresh: () => void
  onClearSelection: () => void
  onToggleColumn: (key: string) => void
  onColumnOrderChange: (order: string[]) => void
  onRowClick: (record: ModuleRecord) => void
  onRowDoubleClick: (record: ModuleRecord) => void
  canCreate: boolean
  canExport: boolean
  toolbarActions: ModuleActionDefinition[]
  onAction: (action: ModuleActionDefinition) => void
  onPageChange: (page: number, pageSize: number) => void
  selectedCount: number
  printDropdown?: React.ReactNode
}

export function BusinessGridContent({
  moduleKey,
  config,
  filters,
  defaultFilters,
  submittedFilters,
  loading,
  exporting,
  records,
  selectedRows,
  total,
  currentPage,
  pageSize,
  warningMessage,
  columnVisibleKeys,
  columnOrder,
  columns,
  rowSelection,
  rowClassName,
  onUpdateFilter,
  onApplyFilters,
  onReset,
  onCreate,
  onExport,
  onRefresh,
  onClearSelection,
  onToggleColumn,
  onColumnOrderChange,
  onRowClick,
  onRowDoubleClick,
  canCreate,
  canExport,
  toolbarActions,
  onAction,
  onPageChange,
  selectedCount,
  printDropdown,
}: Props) {
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const overviewItems = config.buildOverview(
    selectedRows.length ? selectedRows : records,
  )

  return (
    <section className="module-grid-workspace">
      <BusinessGridWorkspaceHeader
        config={config}
        records={records}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
      />

      <div className="module-grid-filter-region">
        <ModuleFilterToolbar
          config={config}
          filters={filters}
          defaultFilters={defaultFilters}
          submittedFilters={submittedFilters}
          onUpdateFilter={onUpdateFilter}
          onApplyFilters={onApplyFilters}
          onReset={onReset}
        />
      </div>

      <div className="module-grid-command-region">
        <ModuleTableToolbar
          canCreate={canCreate}
          canExport={canExport}
          selectedCount={selectedCount}
          loading={loading}
          exporting={exporting}
          onCreate={onCreate}
          onExport={onExport}
          onRefresh={onRefresh}
          onClearSelection={onClearSelection}
          toolbarActions={toolbarActions}
          onAction={onAction}
          extra={
            <>
              {printDropdown}
              <ColumnSettingsPopover
                columns={config.columns}
                orderedKeys={columnOrder}
                visibleKeys={columnVisibleKeys}
                onToggle={onToggleColumn}
                onOrderChange={onColumnOrderChange}
                open={columnSettingsOpen}
                onOpenChange={setColumnSettingsOpen}
              />
            </>
          }
        />
      </div>

      {warningMessage ? (
        <Alert
          type="warning"
          showIcon
          title={warningMessage}
          className="module-grid-warning"
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
      />

      <ModuleTablePagination
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        currentItemCount={records.length}
        overviewItems={overviewItems}
        onPageChange={onPageChange}
      />
    </section>
  )
}
