import { useEffect } from 'react'

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
 */
export function useEditorSaveShortcuts({
  enabled,
  canSave,
  canAudit,
  saving,
  onSave,
}: Options) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 中文等输入法组合过程中的按键不参与快捷键判定
      if (event.isComposing) return
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.key.toLowerCase() !== 's') return

      // 命中编辑器保存快捷键：阻止浏览器默认的「保存网页」
      event.preventDefault()

      if (saving) return
      const audit = event.shiftKey
      if (audit ? !canAudit : !canSave) return

      onSave(audit)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, canSave, canAudit, saving, onSave])
}
