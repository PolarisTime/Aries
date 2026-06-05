import Alert from 'antd/es/alert'
import Card from 'antd/es/card'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { useState } from 'react'
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
  onPageChange: (page: number, pageSize: number) => void
  selectedCount: number
  printDropdown?: React.ReactNode
}

export function BusinessGridContent({
  moduleKey,
  config,
  filters,
  loading,
  exporting,
  records,
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
  onPageChange,
  selectedCount,
  printDropdown,
}: Props) {
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)

  // columnSettingsOpen initialised to false via useState; no mount-effect needed

  return (
    <Card
      className="module-grid-card"
      styles={{ body: { padding: '12px 16px 0' } }}
    >
      <ModuleFilterToolbar
        config={config}
        filters={filters}
        onUpdateFilter={onUpdateFilter}
        onApplyFilters={onApplyFilters}
        onSearch={onSearch}
        onReset={onReset}
      />

      <ModuleTableToolbar
        canCreate={canCreate}
        canExport={canExport}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedCount={selectedCount}
        loading={loading}
        exporting={exporting}
        onPageChange={onPageChange}
        onCreate={onCreate}
        onExport={onExport}
        onRefresh={onRefresh}
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
      />
    </Card>
  )
}
