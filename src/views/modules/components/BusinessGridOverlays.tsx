import { lazy, Suspense } from 'react'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecord,
} from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import {
  loadModuleAttachmentModal,
  loadModuleEditorWorkspace,
  loadModuleRecordDetailOverlay,
} from '@/views/modules/components/business-grid-overlay-loaders'
import { OverlayLazyFallback } from '@/views/modules/components/OverlayLazyFallback'

const ModuleAttachmentModal = lazy(loadModuleAttachmentModal)
const ModuleEditorWorkspace = lazy(loadModuleEditorWorkspace)
const ModuleRecordDetailOverlay = lazy(loadModuleRecordDetailOverlay)

interface Props<Key extends ModuleKey> {
  moduleKey: Key
  config: ModulePageConfig
  editRecord: PersistedModuleEditorDraftFor<Key> | null
  editorSessionKey: number
  initialParentImportSource: ModuleParentImportSource | null
  editorOpen: boolean
  attachOpen: boolean
  attachRecordId: string
  detailOpen: boolean
  detailRecord: ModuleRecord | null
  detailLoading: boolean
  detailError: unknown
  canSave: boolean
  canAudit: boolean
  canCreateAnother: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  onCloseEditor: () => void
  onSaved: () => void
  onCreateAnother: () => void
  onCloseDetail: () => void
  onRetryDetail: () => void
  onCloseAttachment: () => void
}

export function BusinessGridOverlays<Key extends ModuleKey>({
  moduleKey,
  config,
  editRecord,
  editorSessionKey,
  initialParentImportSource,
  editorOpen,
  attachOpen,
  attachRecordId,
  detailOpen,
  detailRecord,
  detailLoading,
  detailError,
  canSave,
  canAudit,
  canCreateAnother,
  lineItemsLocked,
  lockedLineItemsNotice,
  onCloseEditor,
  onSaved,
  onCreateAnother,
  onCloseDetail,
  onRetryDetail,
  onCloseAttachment,
}: Props<Key>) {
  return (
    <Suspense fallback={<OverlayLazyFallback />}>
      {editorOpen ? (
        <ModuleEditorWorkspace
          key={`${moduleKey}-${editorSessionKey}`}
          open={editorOpen}
          config={config}
          record={editRecord}
          initialParentImportSource={initialParentImportSource}
          moduleKey={moduleKey}
          canSave={canSave}
          canAudit={canAudit}
          canCreateAnother={canCreateAnother}
          lineItemsLocked={lineItemsLocked}
          lockedLineItemsNotice={lockedLineItemsNotice}
          onClose={onCloseEditor}
          onSaved={onSaved}
          onCreateAnother={onCreateAnother}
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
    </Suspense>
  )
}
