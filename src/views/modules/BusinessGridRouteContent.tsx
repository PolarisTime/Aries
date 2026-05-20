import { useLocation } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import Spin from 'antd/es/spin'
import { lazy, Suspense } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import type { ModulePageConfig } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { BusinessGridContent } from '@/views/modules/components/BusinessGridContent'
import { BusinessGridOverlays } from '@/views/modules/components/BusinessGridOverlays'
import { WorkspaceContainer } from '@/views/modules/components/WorkspaceContainer'
import { isEditBlockedByStatus } from '@/views/modules/module-behavior-registry'
import { useBusinessGridPage } from '@/views/modules/use-business-grid-page'
import { useBusinessGridRouteSync } from '@/views/modules/use-business-grid-route-sync'
import { useEditorTabsAdapter } from '@/views/modules/useEditorTabsAdapter'

const ModuleEditorWorkspace = lazy(() =>
  import('@/views/modules/components/ModuleEditorWorkspace').then((module) => ({
    default: module.ModuleEditorWorkspace,
  })),
)

const EditorTabBar = lazy(() =>
  import('@/views/modules/components/EditorTabBar').then((module) => ({
    default: module.EditorTabBar,
  })),
)

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

  const editorTabs = useEditorTabsAdapter({
    moduleKey,
    editRecord: state.editRecord,
    editorOpen: state.editorOpen,
    configTitle: state.config?.title || '',
    onCloseEditor: state.closeEditor,
  })

  const hasActiveEditor = editorTabs.activeKey !== null

  if (state.configLoading || (state.isLoading && state.records.length === 0)) {
    return <Spin className="flex justify-center mt-96" />
  }

  if (!state.config) {
    return (
      <Empty description={`模块配置未找到: ${moduleKey}`} className="mt-96" />
    )
  }

  return (
    <div key={moduleKey} className="page-stack module-page-stack">
      <WorkspaceContainer hasActiveEditor={hasActiveEditor}>
        <BusinessGridContent
          key={moduleKey}
          moduleKey={moduleKey}
          config={state.config!}
          filters={state.filters}
          loading={state.isLoading || state.editorLockLoading}
          exporting={state.exporting}
          records={state.records}
          hasNextPage={state.hasNextPage}
          fetchNextPage={() => {
            void state.fetchNextPage()
          }}
          isFetchingNextPage={state.isFetchingNextPage}
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
          canCreate={state.canCreateRecord}
          canExport={state.canExportData}
          toolbarActions={state.visibleToolbarActions}
          onAction={(action) => {
            void state.handleAction(action)
          }}
          onSortingChange={state.onSortingChange}
          containerRef={state.containerRef}
        />
        {hasActiveEditor && state.config ? (
          <Suspense fallback={null}>
            <EditorTabBar
              sessions={editorTabs.sessions}
              activeKey={editorTabs.activeKey}
              onSwitch={(key) => editorTabs.switchTab(key)}
              onClose={(key) => {
                void editorTabs.closeTab(key)
              }}
            />
            <ModuleEditorWorkspace
              open={state.editorOpen}
              config={state.config}
              record={state.editRecord}
              moduleKey={moduleKey}
              canSave={
                state.editRecord ? state.canUpdateRecord : state.canCreateRecord
              }
              canAudit={state.canAuditRecord}
              lineItemsLocked={state.editorLineItemsLocked}
              lockedLineItemsNotice={
                state.editorLineItemsLocked ? state.lockedLineItemsNotice : ''
              }
              onClose={state.closeEditor}
              onSaved={() => {
                state.setSelectedRowKeys([])
                state.handleEditorSaved()
              }}
              variant="inline"
              sessionKey={editorTabs.activeKey ?? undefined}
            />
          </Suspense>
        ) : null}
      </WorkspaceContainer>

      <BusinessGridOverlays
        moduleKey={moduleKey}
        resourceKey={pageDef.resourceKey}
        config={state.config}
        attachOpen={state.overlays.attachOpen}
        attachRecordId={state.overlays.attachRecordId}
        detailOpen={state.detailOpen}
        detailRecord={state.detailRecord}
        detailLoading={state.detailLoading}
        supplierStatementOpen={state.overlays.supplierStatementOpen}
        customerStatementOpen={state.overlays.customerStatementOpen}
        freightStatementOpen={state.overlays.freightStatementOpen}
        freightPickupOpen={state.overlays.freightPickupOpen}
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
