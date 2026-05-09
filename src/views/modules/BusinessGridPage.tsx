import { useLocation } from '@tanstack/react-router'
import { Empty, Flex, Typography } from 'antd'
import type { AppPageDefinition } from '@/config/page-registry'
import { BusinessGridContent } from '@/views/modules/components/BusinessGridContent'
import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'
import { isEditBlockedByStatus } from '@/views/modules/module-behavior-registry'
import { useBusinessGridPage } from '@/views/modules/use-business-grid-page'
import { useBusinessGridRouteSync } from '@/views/modules/use-business-grid-route-sync'

interface Props {
  pageDef: AppPageDefinition
}

export function BusinessGridPage({ pageDef }: Props) {
  const location = useLocation()
  const moduleKey = pageDef.moduleKey as string
  const state = useBusinessGridPage({ moduleKey, pageDef })

  useBusinessGridRouteSync({
    location,
    config: state.config,
    records: state.records,
    setPage: state.setPage,
    clearSelection: state.clearSelection,
    setSubmittedFilters: state.setSubmittedFilters,
    updateFilter: state.updateFilter,
    openDetail: state.openDetail,
  })

  if (!state.config) {
    return (
      <Empty
        description={`模块配置未找到: ${moduleKey}`}
        style={{ marginTop: 96 }}
      />
    )
  }

  return (
    <div className="page-stack module-page-stack">
      {!state.config.hidePageHeader && (
        <Flex vertical gap={4}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {state.config.title}
          </Typography.Title>
        </Flex>
      )}

      <BusinessGridContent
        config={state.config}
        filters={state.filters}
        total={state.total}
        loading={state.isLoading || state.isFetching || state.editorLockLoading}
        exporting={state.exporting}
        records={state.records}
        warningMessage={state.warningMessage}
        columnVisibleKeys={state.columnVisibleKeys}
        columnOrder={state.columnOrder}
        onColumnOrderChange={state.onColumnOrderChange}
        columns={state.antdColumns}
        rowSelection={state.rowSelection}
        rowClassName={state.getRowClassName}
        onUpdateFilter={state.updateFilter}
        onSearch={state.handleSearch}
        onReset={state.handleReset}
        onCreate={() => {
          void state.openEditor(null)
        }}
        onExport={state.handleExport}
        onRefresh={state.refreshModuleQueries}
        onToggleColumn={state.toggleColumn}
        onRowClick={() => {}}
        onRowDoubleClick={(record) => {
          if (state.canUpdateRecord && !isEditBlockedByStatus(record.status)) {
            void state.openEditor(record)
            return
          }
          if (state.canViewRecords) {
            void state.openDetail(record)
          }
        }}
        page={state.page}
        pageSize={state.pageSize}
        canCreate={state.canCreateRecord}
        canExport={state.canExportData}
        toolbarActions={state.visibleToolbarActions}
        onAction={state.handleAction}
        onPageChange={(nextPage, nextPageSize) => {
          state.setPage(nextPage)
          state.setPageSize(nextPageSize)
        }}
        onSortingChange={state.onSortingChange}
      />

      <BusinessGridOverlays
        moduleKey={moduleKey}
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
