import { lazy, Suspense } from 'react'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

const ModuleAttachmentModal = lazy(() =>
  import('@/views/modules/components/ModuleAttachmentModal').then((module) => ({
    default: module.ModuleAttachmentModal,
  })),
)
const ModuleEditorWorkspace = lazy(() =>
  import('@/views/modules/components/ModuleEditorWorkspace').then((module) => ({
    default: module.ModuleEditorWorkspace,
  })),
)
const ModuleFreightPickupListOverlay = lazy(() =>
  import('@/views/modules/components/ModuleFreightPickupListOverlay').then(
    (module) => ({
      default: module.ModuleFreightPickupListOverlay,
    }),
  ),
)
const ModuleRecordDetailOverlay = lazy(() =>
  import('@/views/modules/components/ModuleRecordDetailOverlay').then(
    (module) => ({
      default: module.ModuleRecordDetailOverlay,
    }),
  ),
)
const ModuleStatementGenerator = lazy(() =>
  import('@/views/modules/components/ModuleStatementGenerator').then(
    (module) => ({
      default: module.ModuleStatementGenerator,
    }),
  ),
)

interface Props {
  moduleKey: string
  resourceKey?: string
  config: ModulePageConfig
  editRecord: ModuleRecord | null
  editorOpen: boolean
  attachOpen: boolean
  attachRecordId: string
  detailOpen: boolean
  detailRecord: ModuleRecord | null
  detailLoading: boolean
  supplierStatementOpen: boolean
  customerStatementOpen: boolean
  freightStatementOpen: boolean
  freightPickupOpen: boolean
  freightPickupRecords?: ModuleRecord[]
  selectedRows: ModuleRecord[]
  canSave: boolean
  canAudit: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  onCloseEditor: () => void
  onSaved: () => void
  onCloseDetail: () => void
  onCloseAttachment: () => void
  onCloseSupplierStatement: () => void
  onCloseCustomerStatement: () => void
  onCloseFreightStatement: () => void
  onCloseFreightPickup: () => void
  onGenerateSupplierStatement: (
    counterpartyName: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>
  onGenerateCustomerStatement: (
    counterpartyName: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>
  onGenerateFreightStatement: (
    counterpartyName: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>
}

export function BusinessGridOverlays({
  moduleKey,
  resourceKey,
  config,
  editRecord,
  editorOpen,
  attachOpen,
  attachRecordId,
  detailOpen,
  detailRecord,
  detailLoading,
  supplierStatementOpen,
  customerStatementOpen,
  freightStatementOpen,
  freightPickupOpen,
  freightPickupRecords = [],
  selectedRows,
  canSave,
  canAudit,
  lineItemsLocked,
  lockedLineItemsNotice,
  onCloseEditor,
  onSaved,
  onCloseDetail,
  onCloseAttachment,
  onCloseSupplierStatement,
  onCloseCustomerStatement,
  onCloseFreightStatement,
  onCloseFreightPickup,
  onGenerateSupplierStatement,
  onGenerateCustomerStatement,
  onGenerateFreightStatement,
}: Props) {
  return (
    <Suspense fallback={null}>
      {editorOpen ? (
        <ModuleEditorWorkspace
          open={editorOpen}
          config={config}
          record={editRecord}
          moduleKey={moduleKey}
          canSave={canSave}
          canAudit={canAudit}
          lineItemsLocked={lineItemsLocked}
          lockedLineItemsNotice={lockedLineItemsNotice}
          onClose={onCloseEditor}
          onSaved={onSaved}
        />
      ) : null}

      {detailOpen ? (
        <ModuleRecordDetailOverlay
          open={detailOpen}
          config={config}
          record={detailRecord}
          loading={detailLoading}
          canPrint={false}
          onClose={onCloseDetail}
        />
      ) : null}

      {attachOpen ? (
        <ModuleAttachmentModal
          open={attachOpen}
          moduleKey={moduleKey}
          resourceKey={resourceKey}
          recordId={attachRecordId}
          onClose={onCloseAttachment}
        />
      ) : null}

      {supplierStatementOpen ? (
        <ModuleStatementGenerator
          open={supplierStatementOpen}
          statementType="supplier"
          selectedRows={selectedRows}
          onClose={onCloseSupplierStatement}
          onGenerate={onGenerateSupplierStatement}
        />
      ) : null}
      {customerStatementOpen ? (
        <ModuleStatementGenerator
          open={customerStatementOpen}
          statementType="customer"
          selectedRows={selectedRows}
          onClose={onCloseCustomerStatement}
          onGenerate={onGenerateCustomerStatement}
        />
      ) : null}
      {freightStatementOpen ? (
        <ModuleStatementGenerator
          open={freightStatementOpen}
          statementType="freight"
          selectedRows={selectedRows}
          onClose={onCloseFreightStatement}
          onGenerate={onGenerateFreightStatement}
        />
      ) : null}

      {freightPickupOpen ? (
        <ModuleFreightPickupListOverlay
          open={freightPickupOpen}
          moduleKey={moduleKey}
          records={freightPickupRecords}
          onClose={onCloseFreightPickup}
        />
      ) : null}
    </Suspense>
  )
}
