import { useLocation } from '@tanstack/react-router'
import { Empty } from 'antd'
import { useTranslation } from 'react-i18next'
import type { AppPageDefinition } from '@/config/page-registry'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BusinessGridContent } from '@/views/modules/components/BusinessGridContent'
import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'
import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'
import { PrintTemplateDropdown } from '@/views/modules/components/PrintTemplateDropdown'
import { useBusinessGridOverlayPreload } from '@/views/modules/use-business-grid-overlay-preload'
import { useBusinessGridPage } from '@/views/modules/use-business-grid-page'
import { useBusinessGridRouteSync } from '@/views/modules/use-business-grid-route-sync'

interface Props {
  pageDef: AppPageDefinition
  initialConfig?: ModulePageConfig
}

export function BusinessGridRouteContent({ pageDef, initialConfig }: Props) {
  const { t } = useTranslation()
  const location = useLocation()
  const moduleKey = asString(pageDef.moduleKey)
  const state = useBusinessGridPage({ moduleKey, pageDef, initialConfig })

  useBusinessGridOverlayPreload({
    canUpdateRecord: state.canUpdateRecord,
    canViewRecords: state.canViewRecords,
    config: state.config,
  })

  useBusinessGridRouteSync({
    location,
    config: state.config,
    records: state.records,
    setPage: state.setCurrentPage,
    clearSelection: state.clearSelection,
    defaultFilters: state.defaultFilters,
    setFilters: state.setFilters,
    setSubmittedFilters: state.setSubmittedFilters,
    updateFilter: state.updateFilter,
    openDetail: state.openDetail,
  })

  if (!state.config) {
    return (
      <Empty
        description={`${t('modules.page.moduleConfigNotFound')}: ${moduleKey}`}
        className="mt-96"
      />
    )
  }

  const openRecordDetail = (record: ModuleRecord) => {
    if (state.canViewRecords) {
      void state.openDetail(record)
    }
  }

  const openRecordEditor = (record: ModuleRecord) => {
    if (state.config?.readOnly) {
      openRecordDetail(record)
      return
    }
    if (
      state.canUpdateRecord &&
      !isEditBlockedByStatus(record.status, moduleKey)
    ) {
      void state.openEditor(record)
      return
    }
    openRecordDetail(record)
  }

  return (
    <div key={moduleKey} className="page-stack module-page-stack">
      <BusinessGridContent
        key={moduleKey}
        moduleKey={moduleKey}
        config={state.config}
        filters={state.filters}
        defaultFilters={state.defaultFilters}
        submittedFilters={state.submittedFilters}
        loading={state.isLoading || state.isFetching || state.editorLockLoading}
        exporting={state.exporting}
        records={state.records}
        selectedRows={state.selectedRows}
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
        onApplyFilters={state.applyFilters}
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
        onClearSelection={state.clearSelection}
        onToggleColumn={state.toggleColumn}
        onColumnOrderChange={state.onColumnOrderChange}
        onRowClick={openRecordDetail}
        onRowDoubleClick={openRecordEditor}
        canCreate={
          !state.config.readOnly &&
          state.canCreateRecord &&
          moduleKey !== 'supplier-statement' &&
          moduleKey !== 'customer-statement' &&
          moduleKey !== 'freight-statement'
        }
        canExport={state.canExportData}
        toolbarActions={state.visibleToolbarActions}
        onAction={(action) => {
          void state.handleAction(action)
        }}
        onPageChange={(page, ps) => {
          if (ps !== state.pageSize) {
            state.setPageSize(ps)
          }
          state.setCurrentPage(page)
        }}
        selectedCount={state.selectedRowKeys.length}
        printDropdown={
          <>
            {moduleKey === 'material' && (
              <MaterialImportActions
                canDownloadTemplate={state.canExportData}
                canImport={state.canUpdateRecord}
                onImported={state.refreshModuleQueries}
              />
            )}
            {state.canUseBulkPrintActions && state.selectedRowKeys.length ? (
              <PrintTemplateDropdown
                moduleKey={moduleKey}
                moduleTitle={state.config.title}
                disabled={!state.selectedRowKeys.length}
                loading={false}
                selectedCount={state.selectedRowKeys.length}
                selectedRowKeys={state.selectedRowKeys}
                selectedRows={state.selectedRows}
                onPrint={(mode, template, printOptions) => {
                  void state.handlePrintSelectedRecords(
                    mode,
                    template,
                    printOptions,
                  )
                }}
                onExportPrintXlsx={
                  moduleKey === 'sales-order'
                    ? (printOptions) => {
                        void state.handleExportSalesOrderPrintXlsx(printOptions)
                      }
                    : undefined
                }
              />
            ) : null}
          </>
        }
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
        freightPickupRecords={state.overlays.freightPickupRecords}
        prepaymentAllocationOpen={state.overlays.prepaymentAllocationOpen}
        prepaymentAllocationPayment={state.overlays.prepaymentAllocationPayment}
        selectedRows={state.selectedRows}
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
          state.clearSelection()
          state.handleEditorSaved()
        }}
        onCloseDetail={state.closeDetail}
        onCloseAttachment={state.overlays.closeAttachment}
        onCloseSupplierStatement={state.overlays.closeSupplierStatement}
        onCloseCustomerStatement={state.overlays.closeCustomerStatement}
        onCloseFreightStatement={state.overlays.closeFreightStatement}
        onCloseFreightPickup={state.overlays.closeFreightPickup}
        onClosePrepaymentAllocation={state.overlays.closePrepaymentAllocation}
        onPrepaymentAllocationSaved={async () => {
          state.clearSelection()
          await state.refreshModuleQueries()
        }}
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
