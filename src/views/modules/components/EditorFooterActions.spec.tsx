// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorFooterActions } from './EditorFooterActions'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options?.shortcut ? `${key}:${String(options.shortcut)}` : key,
  }),
}))

function findButton(container: HTMLElement, text: string) {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>('button'),
  ).find((button) => button.textContent === text)
}

describe('EditorFooterActions 保存快捷键提示', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const render = (props: {
    canSave?: boolean
    canAudit?: boolean
    saving?: boolean
    onSave: (audit: boolean) => void
    onCancel?: () => void
  }) => {
    act(() => {
      root.render(
        createElement(EditorFooterActions, {
          canSave: props.canSave ?? true,
          canAudit: props.canAudit ?? true,
          saving: props.saving ?? false,
          onSave: props.onSave,
          onCancel: props.onCancel ?? (() => {}),
        }),
      )
    })
  }

  it('保存/保存并审核按钮带 aria-keyshortcuts 与 title 提示', () => {
    render({ onSave: vi.fn() })

    const saveButton = findButton(container, 'modules.editorFooter.save')
    const auditButton = findButton(
      container,
      'modules.editorFooter.saveAndAudit',
    )

    expect(saveButton?.getAttribute('aria-keyshortcuts')).toBe(
      'Control+S Meta+S',
    )
    expect(saveButton?.getAttribute('title')).toBe(
      'modules.editorFooter.saveShortcutTitle:Ctrl/Cmd + S',
    )
    expect(auditButton?.getAttribute('aria-keyshortcuts')).toBe(
      'Control+Shift+S Meta+Shift+S',
    )
    expect(auditButton?.getAttribute('title')).toBe(
      'modules.editorFooter.saveAndAuditShortcutTitle:Ctrl/Cmd + Shift + S',
    )
  })

  it('保存按钮传入 audit=false，保存并审核传入 audit=true', () => {
    const onSave = vi.fn()
    render({ onSave })

    act(() => {
      findButton(container, 'modules.editorFooter.save')?.click()
    })
    act(() => {
      findButton(container, 'modules.editorFooter.saveAndAudit')?.click()
    })

    expect(onSave).toHaveBeenNthCalledWith(1, false)
    expect(onSave).toHaveBeenNthCalledWith(2, true)
  })

  it('只读/无权限时不渲染对应按钮', () => {
    render({ onSave: vi.fn(), canSave: false, canAudit: false })

    expect(findButton(container, 'modules.editorFooter.save')).toBeUndefined()
    expect(
      findButton(container, 'modules.editorFooter.saveAndAudit'),
    ).toBeUndefined()
  })
})
