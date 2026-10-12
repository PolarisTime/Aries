import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import type { EditorSaveResult } from '@/views/modules/use-editor-submission-controller'
import { SaveResultOverlay } from './SaveResultOverlay'

/**
 * 编辑器保存回执弹层的宿主：无回执时什么都不渲染。
 *
 * <p>从 ModuleEditorWorkspace 抽出：这里聚合了「保存成功才关编辑器」「冲突时重载」
 * 「继续新建」三条分支与回单文件读取，内联在编辑器外壳里会同时推高它的行数和
 * 控制流复杂度（react-doctor/no-giant-component 与
 * no-high-complexity-react-function）。pendingFiles 用回调惰性求值，
 * 保持「只在有回执时才读表单附件」的原有行为。</p>
 */

interface Props<Key extends ModuleKey> {
  canCreateAnother: boolean
  config: ModulePageConfig
  moduleKey: Key
  onClearSaveResult: () => void
  onCloseEditor: () => void
  onCreateAnother: () => void
  onResolveConflict: () => void
  resolvePendingFiles: () => readonly File[]
  resolvingConflict: boolean
  saveResult: EditorSaveResult<Key> | null
}

export function ModuleEditorSaveResultHost<Key extends ModuleKey>({
  canCreateAnother,
  config,
  moduleKey,
  onClearSaveResult,
  onCloseEditor,
  onCreateAnother,
  onResolveConflict,
  resolvePendingFiles,
  resolvingConflict,
  saveResult,
}: Props<Key>) {
  if (!saveResult) {
    return null
  }

  return (
    <SaveResultOverlay
      saveResult={saveResult}
      config={config}
      moduleKey={moduleKey}
      canCreateAnother={canCreateAnother}
      resolvingConflict={resolvingConflict}
      onClear={() => {
        onClearSaveResult()
        if (saveResult.status !== 'error') onCloseEditor()
      }}
      onResolveConflict={onResolveConflict}
      onCreateAnother={() => {
        onClearSaveResult()
        onCloseEditor()
        onCreateAnother()
      }}
      pendingFiles={resolvePendingFiles()}
    />
  )
}
