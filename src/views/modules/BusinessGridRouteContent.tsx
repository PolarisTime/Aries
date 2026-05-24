import { useLocation } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import type { AppPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BusinessGridContent } from '@/views/modules/components/BusinessGridContent'
import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'
import { useBusinessGridPage } from '@/views/modules/use-business-grid-page'
import { useBusinessGridRouteSync } from '@/views/modules/use-business-grid-route-sync'

interface Props {
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

export function BusinessGridRouteContent({ pageDef, initialConfig }: Props) {
  const location = useLocation()
  const moduleKey = asString(pageDef.moduleKey)
  const state = useBusinessGridPage({ moduleKey, pageDef, initialConfig })

  useBusinessGridRouteSync({
    location,
    config: state.config,
    records: state.records,
    setPage: () => {},
    clearSelection: state.clearSelection,
    setSubmittedFilters: state.setSubmittedFilters,
    updateFilter: state.updateFilter,
    openDetail: state.openDetail,
  })

  if (!state.config) {
    return (
      <Empty description={`模块配置未找到: ${moduleKey}`} className="mt-96" />
    )
  }

  return (
    <div key={moduleKey} className="page-stack module-page-stack">
      <BusinessGridContent
        key={moduleKey}
        moduleKey={moduleKey}
        config={state.config}
        filters={state.filters}
        loading={state.isLoading || state.editorLockLoading}
        exporting={state.exporting}
        records={state.records}
        total={state.total}
        currentPage={state.currentPage}
        pageSize={state.pageSize}
        warningMessage={state.warningMessage}
        columnVisibleKeys={state.columnVisibleKeys}
        columnOrder={state.columnOrder}
        columns={state.antdColumns}
        rowSelection={state.rowSelection}
        rowClassName={state.getRowClassName}
        onUpdateFilter={state.updateFilter}
        onSearch={state.handleSearch}
        onReset={state.handleReset}
        onCreate={() => {
          void state.openEditor(null)
        }}
        onExport={() => {
          void state.handleExport()
        }}
        onRefresh={() => {
          void state.refreshModuleQueries()
        }}
        onToggleColumn={state.toggleColumn}
        onColumnOrderChange={state.onColumnOrderChange}
        onRowClick={(record) => {
          const id = String(record.id)
          state.setSelectedRowKeys((prev) => {
            if (prev.includes(id)) return prev.filter((k) => k !== id)
            return [...prev, id]
          })
          state.setSelectedRowMap((prev) => {
            if (prev[id]) {
              const next = { ...prev }
              delete next[id]
              return next
            }
            return { ...prev, [id]: record }
          })
        }}
        onRowDoubleClick={(record) => {
          if (state.canUpdateRecord && !isEditBlockedByStatus(record.status)) {
            void state.openEditor(record)
            return
          }
          if (state.canViewRecords) {
            void state.openDetail(record)
          }
        }}
        canCreate={state.canCreateRecord}
        canExport={state.canExportData}
        toolbarActions={state.visibleToolbarActions}
        onAction={(action) => {
          void state.handleAction(action)
        }}
        onSortingChange={state.onSortingChange}
        onPageChange={(page, ps) => {
          if (ps !== state.pageSize) {
            state.setPageSize(ps)
          }
          state.setCurrentPage(page)
        }}
        selectedCount={state.selectedRowKeys.length}
      />

      <BusinessGridOverlays
        moduleKey={moduleKey}
        resourceKey={pageDef.resourceKey}
        config={state.config}
        editRecord={state.editRecord}
        editorOpen={state.editorOpen}
        attachOpen={state.overlays.attachOpen}
        attachRecordId={state.overlays.attachRecordId}
        detailOpen={state.detailOpen}
        detailRecord={state.detailRecord}
        detailLoading={state.detailLoading}
        supplierStatementOpen={state.overlays.supplierStatementOpen}
        customerStatementOpen={state.overlays.customerStatementOpen}
        freightStatementOpen={state.overlays.freightStatementOpen}
        freightPickupOpen={state.overlays.freightPickupOpen}
        selectedRows={state.records.filter((r) =>
          state.selectedRowKeys.includes(String(r.id)),
        )}
        canSave={
          state.editRecord ? state.canUpdateRecord : state.canCreateRecord
        }
        canAudit={state.canAuditRecord}
        lineItemsLocked={state.editorLineItemsLocked}
        lockedLineItemsNotice={
          state.editorLineItemsLocked ? state.lockedLineItemsNotice : ''
        }
        onCloseEditor={state.closeEditor}
        onSaved={() => {
          state.setSelectedRowKeys([])
          state.handleEditorSaved()
        }}
        onCloseDetail={state.closeDetail}
        onCloseAttachment={state.overlays.closeAttachment}
        onCloseSupplierStatement={state.overlays.closeSupplierStatement}
        onCloseCustomerStatement={state.overlays.closeCustomerStatement}
        onCloseFreightStatement={state.overlays.closeFreightStatement}
        onCloseFreightPickup={state.overlays.closeFreightPickup}
        onGenerateSupplierStatement={(counterpartyName, start, end) =>
          state.handleStatementGenerate(
            'supplier',
            counterpartyName,
            start,
            end,
          )
        }
        onGenerateCustomerStatement={(counterpartyName, start, end) =>
          state.handleStatementGenerate(
            'customer',
            counterpartyName,
            start,
            end,
          )
        }
        onGenerateFreightStatement={(counterpartyName, start, end) =>
          state.handleStatementGenerate('freight', counterpartyName, start, end)
        }
      />
    </div>
  )
}
