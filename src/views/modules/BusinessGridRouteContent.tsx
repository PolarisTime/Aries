import { useLocation } from '@tanstack/react-router'
import { Empty } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import type { AppPageDefinition } from '@/config/page-registry'
import { assertModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
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
  const moduleKey = assertModuleKey(asString(pageDef.moduleKey))
  const state = useBusinessGridPage({ moduleKey, pageDef, initialConfig })

  useBusinessGridOverlayPreload({
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
    openEditor: state.openEditor,
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
    void state.openDetail(record)
  }

  const openRecordEditor = (record: ModuleRecord) => {
    if (state.config?.readOnly) {
      openRecordDetail(record)
      return
    }
    if (resolveModuleRecordCapabilities(record, moduleKey).canEdit) {
      void state.openEditor(record)
      return
    }
    openRecordDetail(record)
  }

  const toggleRecordSelection = (record: ModuleRecord) => {
    const recordKey = String(record.id)
    const isSelected = state.selectedRowKeys.includes(recordKey)
    const nextSelectedRowKeys = isSelected
      ? state.selectedRowKeys.filter((key) => key !== recordKey)
      : [...state.selectedRowKeys, recordKey]
    const nextSelectedKeySet = new Set(nextSelectedRowKeys)
    const nextSelectedRows = state.records.filter((row) =>
      nextSelectedKeySet.has(String(row.id)),
    )
    state.rowSelection?.onChange?.(nextSelectedRowKeys, nextSelectedRows, {
      type: 'single',
    })
  }

  const canCreateRecord =
    !state.config.readOnly &&
    state.config.allowManualCreate !== false &&
    moduleKey !== 'customer-statement' &&
    moduleKey !== 'freight-statement'
  const canSaveEditorRecord = state.editRecord
    ? !state.config.readOnly &&
      resolveModuleRecordCapabilities(state.editRecord, moduleKey).canEdit
    : !state.config.readOnly && state.config.allowManualCreate !== false

  return (
    <AppProPage
      className="business-grid-pro-page"
      description={state.config.description}
      title={state.config.title}
    >
      <div key={moduleKey} className="page-stack module-page-stack">
        <BusinessGridContent
          key={moduleKey}
          moduleKey={moduleKey}
          config={state.config}
          filters={state.filters}
          defaultFilters={state.defaultFilters}
          submittedFilters={state.submittedFilters}
          loading={
            state.isLoading || state.isFetching || state.editorLockLoading
          }
          loadErrorMessage={state.listErrorMessage}
          hasLoadError={state.listHasError}
          exporting={state.exporting}
          records={state.records}
          selectedRows={state.selectedRows}
          total={state.total}
          currentPage={state.currentPage}
          pageSize={state.pageSize}
          columnVisibleKeys={state.columnVisibleKeys}
          columnOrder={state.columnOrder}
          columns={state.antdColumns}
          rowSelection={state.rowSelection}
          rowClassName={state.getRowClassName}
          onUpdateFilter={state.updateFilter}
          onApplyFilters={state.applyFilters}
          onReset={state.handleReset}
          onCreate={() => {
            if (canCreateRecord) {
              void state.openEditor(null)
            }
          }}
          onExport={() => {
            void state.handleExport()
          }}
          onRefresh={() => {
            void state.refreshModuleQueries()
          }}
          onRetry={() => {
            void state.retryList()
          }}
          onClearSelection={state.clearSelection}
          onToggleColumn={state.toggleColumn}
          onColumnOrderChange={state.onColumnOrderChange}
          onRowClick={toggleRecordSelection}
          onRowDoubleClick={openRecordEditor}
          canCreate={canCreateRecord}
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
                    return state.handlePrintSelectedRecords(
                      mode,
                      template,
                      printOptions,
                    )
                  }}
                  onExportPrintXlsx={
                    moduleKey === 'sales-order'
                      ? (printOptions) => {
                          return state.handleExportSalesOrderPrintXlsx(
                            printOptions,
                          )
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
          config={state.config}
          editRecord={state.editRecord}
          editorSessionKey={state.editorSessionKey}
          initialParentImportSource={state.initialParentImportSource}
          editorOpen={state.editorOpen}
          attachOpen={state.overlays.attachOpen}
          attachRecordId={state.overlays.attachRecordId}
          detailOpen={state.detailOpen}
          detailRecord={state.detailRecord}
          detailLoading={state.detailLoading}
          detailError={state.detailError}
          freightPickupOpen={state.overlays.freightPickupOpen}
          freightPickupRecords={state.overlays.freightPickupRecords}
          canSave={canSaveEditorRecord}
          canAudit={state.canAuditRecord}
          canCreateAnother={canCreateRecord}
          lineItemsLocked={state.editorLineItemsLocked}
          lockedLineItemsNotice={
            state.editorLineItemsLocked ? state.lockedLineItemsNotice : ''
          }
          onCloseEditor={state.closeEditor}
          onSaved={() => {
            state.clearSelection()
            state.handleEditorSaved()
          }}
          onCreateAnother={() => {
            state.clearSelection()
            void state.openEditor(null)
          }}
          onCloseDetail={state.closeDetail}
          onRetryDetail={state.retryDetail}
          onCloseAttachment={state.overlays.closeAttachment}
          onCloseFreightPickup={state.overlays.closeFreightPickup}
        />
      </div>
    </AppProPage>
  )
}
