import { lazy, Suspense } from 'react'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import {
  loadModuleAttachmentModal,
  loadModuleEditorWorkspace,
  loadModuleFreightPickupListOverlay,
  loadModuleRecordDetailOverlay,
} from '@/views/modules/components/business-grid-overlay-loaders'
import { OverlayLazyFallback } from '@/views/modules/components/OverlayLazyFallback'

const EMPTY_FREIGHT_PICKUP_RECORDS: ModuleRecord[] = []

const ModuleAttachmentModal = lazy(loadModuleAttachmentModal)
const ModuleEditorWorkspace = lazy(loadModuleEditorWorkspace)
const ModuleFreightPickupListOverlay = lazy(loadModuleFreightPickupListOverlay)
const ModuleRecordDetailOverlay = lazy(loadModuleRecordDetailOverlay)

interface Props<Key extends ModuleKey> {
  moduleKey: Key
  config: ModulePageConfig
  editRecord: PersistedModuleEditorDraftFor<Key> | null
  editorOpen: boolean
  attachOpen: boolean
  attachRecordId: string
  detailOpen: boolean
  detailRecord: ModuleRecord | null
  detailLoading: boolean
  detailError: unknown
  freightPickupOpen: boolean
  freightPickupRecords?: ModuleRecord[]
  canSave: boolean
  canAudit: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  onCloseEditor: () => void
  onSaved: () => void
  onCloseDetail: () => void
  onRetryDetail: () => void
  onCloseAttachment: () => void
  onCloseFreightPickup: () => void
}

export function BusinessGridOverlays<Key extends ModuleKey>({
  moduleKey,
  config,
  editRecord,
  editorOpen,
  attachOpen,
  attachRecordId,
  detailOpen,
  detailRecord,
  detailLoading,
  detailError,
  freightPickupOpen,
  freightPickupRecords = EMPTY_FREIGHT_PICKUP_RECORDS,
  canSave,
  canAudit,
  lineItemsLocked,
  lockedLineItemsNotice,
  onCloseEditor,
  onSaved,
  onCloseDetail,
  onRetryDetail,
  onCloseAttachment,
  onCloseFreightPickup,
}: Props<Key>) {
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
          error={detailError}
          canPrint={false}
          onClose={onCloseDetail}
          onRetry={onRetryDetail}
        />
      ) : null}

      {attachOpen ? (
        <ModuleAttachmentModal
          open={attachOpen}
          moduleKey={moduleKey}
          recordId={attachRecordId}
          onClose={onCloseAttachment}
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
