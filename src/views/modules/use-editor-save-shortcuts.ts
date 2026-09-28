import {
  hasShortcutModifier,
  useGlobalShortcut,
} from '@/hooks/useGlobalShortcut'

interface Options {
  /** 编辑器是否处于打开状态；关闭时不注册任何监听。 */
  enabled: boolean
  /** 是否允许保存（只读/无权限时为 false）。 */
  canSave: boolean
  /** 是否允许保存并审核。 */
  canAudit: boolean
  /** 正在保存：忽略本次快捷键，避免重复提交。 */
  saving: boolean
  onSave: (audit: boolean) => void
}

/**
 * 单据编辑器保存快捷键。
 *
 * <ul>
 *   <li>Ctrl/Cmd + S：保存</li>
 *   <li>Ctrl/Cmd + Shift + S：保存并审核</li>
 * </ul>
 *
 * <p>监听挂在 window 捕获阶段，焦点无论落在表单、明细任意输入控件还是弹层内都能命中；
 * 命中后先 <code>preventDefault()</code> 阻止浏览器「保存网页 / 另存为」，再按权限决定
 * 是否真正保存。输入法组合态（<code>isComposing</code>）直接放行，避免打断中文输入。</p>
 *
 * <p>守卫口径与其余全局快捷键统一收敛在 {@link useGlobalShortcut}；本快捷键刻意不屏蔽
 * 可编辑目标 —— 焦点在表单/明细输入框内时也必须能保存。</p>
 */
export function useEditorSaveShortcuts({
  enabled,
  canSave,
  canAudit,
  saving,
  onSave,
}: Options) {
  useGlobalShortcut({
    enabled,
    ignoreEditableTarget: false,
    match: (event) =>
      hasShortcutModifier(event) && event.key.toLowerCase() === 's',
    run: (event) => {
      // 命中编辑器保存快捷键：阻止浏览器默认的「保存网页」
      event.preventDefault()

      if (saving) return
      const audit = event.shiftKey
      if (audit ? !canAudit : !canSave) return

      onSave(audit)
    },
  })
}
