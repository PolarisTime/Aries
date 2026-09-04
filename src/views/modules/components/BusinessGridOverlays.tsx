import { lazy, Suspense } from 'react'
import type { DetailItem } from '@/hooks/useDetailSupport'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
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
  initialEditorValues: Record<string, unknown> | null
  editorOpen: boolean
  attachOpen: boolean
  attachRecordId: string
  detailItems: DetailItem<Key>[]
  canSave: boolean
  canAudit: boolean
  canCreateAnother: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  onCloseEditor: () => void
  onSaved: () => void
  onCreateAnother: () => void
  onCloseDetail: (recordId: string) => void
  onRetryDetail: (recordId: string) => void
  onCloseAttachment: () => void
}

export function BusinessGridOverlays<Key extends ModuleKey>({
  moduleKey,
  config,
  editRecord,
  editorSessionKey,
  initialParentImportSource,
  initialEditorValues,
  editorOpen,
  attachOpen,
  attachRecordId,
  detailItems,
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
          initialEditorValues={initialEditorValues}
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

      {detailItems.map((detailItem) => (
        <ModuleRecordDetailOverlay
          key={detailItem.recordId}
          open
          config={config}
          record={detailItem.record}
          loading={detailItem.loading}
          error={detailItem.error}
          canPrint={false}
          onClose={() => onCloseDetail(detailItem.recordId)}
          onRetry={() => onRetryDetail(detailItem.recordId)}
        />
      ))}

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
