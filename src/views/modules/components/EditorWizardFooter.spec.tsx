// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { EditorWizardFooter } from './EditorWizardFooter'

describe('EditorWizardFooter 统一底栏与单主按钮契约', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderFooter(
    overrides: Partial<Parameters<typeof EditorWizardFooter>[0]> = {},
  ) {
    const props: Parameters<typeof EditorWizardFooter>[0] = {
      currentStep: 0,
      totalSteps: 3,
      isEdit: false,
      canSave: true,
      canAudit: false,
      saving: false,
      onPrevious: vi.fn(),
      onNext: vi.fn(),
      onCancel: vi.fn(),
      onSave: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(EditorWizardFooter, props))
    })
    return props
  }

  const buttons = () =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
  const primaryButtons = () =>
    buttons().filter((btn) => btn.className.includes('ant-btn-primary'))

  it('新建态非末步：展示进度与完整按钮顺序，仅「下一步」为唯一主按钮', () => {
    renderFooter({ currentStep: 0, totalSteps: 3, isEdit: false })

    expect(container.textContent).toContain('第 1 / 3 步')
    expect(buttons().map((btn) => btn.textContent?.trim())).toEqual([
      '取消',
      '上一步',
      '下一步',
      '保存',
    ])
    expect(buttons()[1]?.disabled).toBe(true)
    expect(primaryButtons().map((btn) => btn.textContent?.trim())).toEqual([
      '下一步',
    ])
  })

  it('新建态末步：隐藏「下一步」，仅「保存」为唯一主按钮', () => {
    renderFooter({ currentStep: 2, totalSteps: 3, isEdit: false })

    expect(container.textContent).toContain('第 3 / 3 步')
    expect(buttons().map((btn) => btn.textContent?.trim())).toEqual([
      '取消',
      '上一步',
      '保存',
    ])
    expect(buttons()[1]?.disabled).toBe(false)
    expect(primaryButtons().map((btn) => btn.textContent?.trim())).toEqual([
      '保存',
    ])
  })

  it('编辑态非末步：仅「保存」（或有审核权限时「保存并审核」）为唯一主按钮，「下一步」降为默认样式', () => {
    renderFooter({
      currentStep: 0,
      totalSteps: 3,
      isEdit: true,
      canSave: true,
      canAudit: false,
    })
    expect(primaryButtons().map((btn) => btn.textContent?.trim())).toEqual([
      '保存',
    ])

    renderFooter({
      currentStep: 1,
      totalSteps: 3,
      isEdit: true,
      canSave: true,
      canAudit: true,
    })
    expect(primaryButtons().map((btn) => btn.textContent?.trim())).toEqual([
      '保存并审核',
    ])
  })

  it('只读态非末步无保存权限时：「下一步」充当唯一主按钮', () => {
    renderFooter({
      currentStep: 0,
      totalSteps: 3,
      isEdit: true,
      canSave: false,
      canAudit: false,
    })
    expect(buttons().map((btn) => btn.textContent?.trim())).toEqual([
      '取消',
      '上一步',
      '下一步',
    ])
    expect(primaryButtons().map((btn) => btn.textContent?.trim())).toEqual([
      '下一步',
    ])
  })
})
