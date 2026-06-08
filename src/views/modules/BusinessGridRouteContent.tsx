import { useLocation } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppPageDefinition } from '@/config/page-registry'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'
import type { ModulePageConfig } from '@/types/module-page'
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

function toggleSelectedKey(
  setSelectedRowKeys: Dispatch<SetStateAction<string[]>>,
  recordId: string,
) {
  setSelectedRowKeys((prev) => {
    if (prev.includes(recordId)) return prev.filter((key) => key !== recordId)
    return [...prev, recordId]
  })
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
    setPage: () => {},
    clearSelection: state.clearSelection,
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
        onApplyFilters={state.applyFilters}
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
          toggleSelectedKey(state.setSelectedRowKeys, id)
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
          if (state.config?.readOnly) {
            if (state.canViewRecords) {
              void state.openDetail(record)
            }
            return
          }
          if (
            state.canUpdateRecord &&
            !isEditBlockedByStatus(record.status, moduleKey)
          ) {
            void state.openEditor(record)
            return
          }
          if (state.canViewRecords) {
            void state.openDetail(record)
          }
        }}
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
            {state.canUseBulkPrintActions ? (
              <PrintTemplateDropdown
                moduleKey={moduleKey}
                disabled={!state.selectedRowKeys.length}
                loading={false}
                onPrint={(mode, template) => {
                  void state.handlePrintSelectedRecords(mode, template)
                }}
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
