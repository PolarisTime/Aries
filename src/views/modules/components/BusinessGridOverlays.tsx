import { lazy, Suspense } from 'react'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  loadModuleAttachmentModal,
  loadModuleEditorWorkspace,
  loadModuleFreightPickupListOverlay,
  loadModuleRecordDetailOverlay,
  loadModuleStatementGenerator,
  loadPaymentPrepaymentAllocationModal,
} from '@/views/modules/components/business-grid-overlay-loaders'
import { OverlayLazyFallback } from '@/views/modules/components/OverlayLazyFallback'

const EMPTY_FREIGHT_PICKUP_RECORDS: ModuleRecord[] = []

const ModuleAttachmentModal = lazy(loadModuleAttachmentModal)
const ModuleEditorWorkspace = lazy(loadModuleEditorWorkspace)
const ModuleFreightPickupListOverlay = lazy(loadModuleFreightPickupListOverlay)
const ModuleRecordDetailOverlay = lazy(loadModuleRecordDetailOverlay)
const ModuleStatementGenerator = lazy(loadModuleStatementGenerator)
const PaymentPrepaymentAllocationModal = lazy(
  loadPaymentPrepaymentAllocationModal,
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
  prepaymentAllocationOpen: boolean
  prepaymentAllocationPayment: ModuleRecord | null
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
  onClosePrepaymentAllocation: () => void
  onPrepaymentAllocationSaved: () => Promise<void> | void
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
  freightPickupRecords = EMPTY_FREIGHT_PICKUP_RECORDS,
  prepaymentAllocationOpen,
  prepaymentAllocationPayment,
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
  onClosePrepaymentAllocation,
  onPrepaymentAllocationSaved,
  onGenerateSupplierStatement,
  onGenerateCustomerStatement,
  onGenerateFreightStatement,
}: Props) {
  return (
    <Suspense fallback={<OverlayLazyFallback />}>
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

      {prepaymentAllocationOpen ? (
        <PaymentPrepaymentAllocationModal
          open={prepaymentAllocationOpen}
          payment={prepaymentAllocationPayment}
          onClose={onClosePrepaymentAllocation}
          onSaved={onPrepaymentAllocationSaved}
        />
      ) : null}
    </Suspense>
  )
}
