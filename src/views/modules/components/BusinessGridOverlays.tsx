import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { ModuleEditorWorkspace } from '@/views/modules/components/ModuleEditorWorkspace'
import { ModuleFreightPickupListOverlay } from '@/views/modules/components/ModuleFreightPickupListOverlay'
import { ModuleRecordDetailOverlay } from '@/views/modules/components/ModuleRecordDetailOverlay'
import { ModuleStatementGenerator } from '@/views/modules/components/ModuleStatementGenerator'

interface Props {
  moduleKey: string
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
    <>
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

      <ModuleRecordDetailOverlay
        open={detailOpen}
        config={config}
        record={detailRecord}
        loading={detailLoading}
        canPrint={false}
        onClose={onCloseDetail}
      />

      <ModuleAttachmentModal
        open={attachOpen}
        moduleKey={moduleKey}
        recordId={attachRecordId}
        onClose={onCloseAttachment}
      />

      <ModuleStatementGenerator
        open={supplierStatementOpen}
        statementType="supplier"
        onClose={onCloseSupplierStatement}
        onGenerate={onGenerateSupplierStatement}
      />
      <ModuleStatementGenerator
        open={customerStatementOpen}
        statementType="customer"
        onClose={onCloseCustomerStatement}
        onGenerate={onGenerateCustomerStatement}
      />
      <ModuleStatementGenerator
        open={freightStatementOpen}
        statementType="freight"
        onClose={onCloseFreightStatement}
        onGenerate={onGenerateFreightStatement}
      />

      <ModuleFreightPickupListOverlay
        open={freightPickupOpen}
        moduleKey={moduleKey}
        onClose={onCloseFreightPickup}
      />
    </>
  )
}
