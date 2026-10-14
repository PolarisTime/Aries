import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { ERROR_CODE } from '@/constants/error-codes'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import type { EditorSaveResult } from '@/views/modules/use-editor-submission-controller'
import { ModuleAttachmentModal } from './ModuleAttachmentModal'
import { buildModuleItemGroups } from './module-item-groups'
import { SaveResultActionBar } from './SaveResultActionBar'
import { SaveResultFieldSummary } from './SaveResultFieldSummary'
import { SaveResultItemGroups } from './SaveResultItemGroups'
import {
  buildSaveResultItemColumns,
  NEXT_MODULE_PATHS,
  resolveSaveResultActions,
  resolveSaveResultItems,
  resolveSaveResultSubtitle,
  resolveSaveResultTitle,
} from './save-result-overlay-utils'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface SaveResultOverlayProps<Key extends ModuleKey> {
  saveResult: EditorSaveResult<Key>
  config: ModulePageConfig
  moduleKey: Key
  canCreateAnother: boolean
  resolvingConflict: boolean
  onClear: () => void
  onResolveConflict: () => void
  onCreateAnother: () => void
  pendingFiles: readonly File[]
}

/**
 * 编辑器保存后的结果回执弹窗：状态、快捷跳转、回单上传与只读明细。
 *
 * <p>操作区、字段摘要、只读明细分组分别抽到 SaveResultActionBar /
 * SaveResultFieldSummary / SaveResultItemGroups，明细提取、只读列与标题文案
 * 抽到 save-result-overlay-utils.ts。原因：这些区块各自带一组状态守卫与分支，
 * 内联时整个弹窗的控制流复杂度远超 react-doctor 阈值
 * (no-high-complexity-react-function)。这里只保留「按保存状态决定渲染哪一块」，
 * AppResult 的 status/title/subTitle/traceId 与弹窗类名逐字不变。</p>
 */
export function SaveResultOverlay<Key extends ModuleKey>({
  saveResult,
  config,
  moduleKey,
  canCreateAnother,
  resolvingConflict,
  onClear,
  onResolveConflict,
  onCreateAnother,
  pendingFiles,
}: SaveResultOverlayProps<Key>) {
  const { t } = useTranslation()
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const { formatCellValue } = useModuleDisplaySupport()

  const items = resolveSaveResultItems(saveResult.record)
  const isSuccess =
    saveResult.status === 'success' || saveResult.status === 'warning'
  const isConflict =
    saveResult.status === 'error' &&
    saveResult.errorCode === ERROR_CODE.CONCURRENT_MODIFICATION
  const recordId = String(saveResult.record?.id || '')
  const canUploadAttachment = Boolean(isSuccess && saveResult.record?.id)
  const itemColumns = buildSaveResultItemColumns(config, formatCellValue)
  const itemGroups = buildModuleItemGroups(moduleKey, items)
  // 按钮集合按「本次动作 + 单据是否已生效」派生：草稿回执不给下游入口，也不给审核类动作。
  const actions = resolveSaveResultActions({
    action: saveResult.action,
    canCreateAnother,
    canUploadAttachment,
    hasNextModule: Boolean(NEXT_MODULE_PATHS[moduleKey]),
    isSuccess,
  })

  const title = resolveSaveResultTitle({
    config,
    isConflict,
    isSuccess,
    t,
    action: saveResult.action,
    auditActionKind: saveResult.auditActionKind,
    documentNo: saveResult.documentNo,
  })

  return (
    <WorkspaceOverlay
      open
      title={config.title}
      onClose={isConflict ? onResolveConflict : onClear}
      className="save-result-overlay"
    >
      {/* 结果页是新插入的内容，读屏不会自动播报：用 sr-only 的 live region 播报标题。 */}
      <div
        className="aries-sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {title}
      </div>
      <AppResult
        className="app-result--workspace"
        status={saveResult.status}
        title={title}
        subTitle={resolveSaveResultSubtitle({
          action: saveResult.action,
          auditActionKind: saveResult.auditActionKind,
          fallback: saveResult.message,
          isSuccess,
          t,
        })}
        traceId={saveResult.traceId}
        extra={
          <SaveResultActionBar
            actions={actions}
            isConflict={isConflict}
            moduleKey={moduleKey}
            onClear={onClear}
            onCreateAnother={onCreateAnother}
            onOpenAttachments={() => setAttachmentOpen(true)}
            onResolveConflict={onResolveConflict}
            recordId={recordId}
            resolvingConflict={resolvingConflict}
            status={saveResult.status}
          />
        }
      />

      {saveResult.record ? (
        <SaveResultFieldSummary config={config} record={saveResult.record} />
      ) : null}

      {items.length > 0 ? (
        <SaveResultItemGroups
          itemColumns={itemColumns}
          itemGroups={itemGroups}
          moduleKey={moduleKey}
        />
      ) : null}

      {canUploadAttachment && saveResult.record ? (
        <ModuleAttachmentModal
          open={attachmentOpen}
          moduleKey={moduleKey}
          recordId={recordId}
          initialFiles={pendingFiles}
          onClose={() => setAttachmentOpen(false)}
        />
      ) : null}
    </WorkspaceOverlay>
  )
}
