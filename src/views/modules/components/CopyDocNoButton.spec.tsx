// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { messageSuccessMock, messageWarningMock } = vi.hoisted(() => ({
  messageSuccessMock: vi.fn(),
  messageWarningMock: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: messageSuccessMock, warning: messageWarningMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { CopyDocNoButton } from './CopyDocNoButton'

describe('CopyDocNoButton 详情头部复制单号', () => {
  let container: HTMLDivElement
  let root: Root
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } })
    messageSuccessMock.mockReset()
    messageWarningMock.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.unstubAllGlobals()
  })

  const render = (docNo: string) => {
    act(() => {
      root.render(createElement(CopyDocNoButton, { docNo, size: 'small' }))
    })
  }

  it('有单号时在头部渲染复制按钮，可访问名含单号', () => {
    render('XS-2024-001')

    const button = container.querySelector('button')
    expect(button?.textContent).toContain('hooks.recordActions.copyDocNo')
    expect(button?.getAttribute('aria-label')).toBe(
      'hooks.recordActions.copyDocNo XS-2024-001',
    )
  })

  it('点击写入剪贴板并提示成功', async () => {
    render('XS-2024-001')

    await act(async () => {
      container.querySelector('button')?.click()
      await Promise.resolve()
    })

    expect(writeTextMock).toHaveBeenCalledWith('XS-2024-001')
    expect(messageSuccessMock).toHaveBeenCalledWith(
      'hooks.recordActions.copyDocNoSuccess',
    )
  })

  it('无单号时整体不渲染', () => {
    render('')

    expect(container.querySelector('button')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('单号只有空白时同样不渲染', () => {
    render('   ')

    expect(container.querySelector('button')).toBeNull()
  })
})
