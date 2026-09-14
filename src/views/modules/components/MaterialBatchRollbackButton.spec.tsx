// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'

const { rollbackMock } = vi.hoisted(() => ({ rollbackMock: vi.fn() }))
vi.mock('@/api/master/materials', () => ({
  rollbackMaterialImportBatch: rollbackMock,
}))

const { messageMock, confirmMock } = vi.hoisted(() => ({
  messageMock: { success: vi.fn(), error: vi.fn() },
  confirmMock: vi.fn(),
}))
vi.mock('@/utils/antd-app', () => ({
  message: messageMock,
  modal: { confirm: confirmMock },
}))

import { MaterialBatchRollbackButton } from './MaterialBatchRollbackButton'

describe('MaterialBatchRollbackButton', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    confirmMock.mockImplementation((config: { onOk?: () => unknown }) =>
      config.onOk?.(),
    )
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('二次确认后调用回滚接口并展示统计', async () => {
    rollbackMock.mockResolvedValue({
      importBatchNo: '888',
      totalRows: 5,
      createdRolledBack: 2,
      updatedRestored: 3,
      missing: 0,
    })
    const onRolledBack = vi.fn()

    act(() => {
      root.render(
        createElement(MaterialBatchRollbackButton, {
          importBatchNo: '888',
          onRolledBack,
        }),
      )
    })
    await flushAsync()

    const button = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.includes('回滚该批次'),
    )
    expect(button).toBeTruthy()
    act(() => {
      button?.click()
    })
    await flushAsync()

    expect(confirmMock).toHaveBeenCalledTimes(1)
    expect(rollbackMock).toHaveBeenCalledWith('888')
    expect(onRolledBack).toHaveBeenCalledTimes(1)
    expect(messageMock.success).toHaveBeenCalledTimes(1)

    const text = document.body.textContent ?? ''
    expect(text).toContain('批次行数')
    expect(text).toContain('新建软删')
    expect(text).toContain('更新还原')
  })

  it('回滚失败时提示错误且不触发刷新', async () => {
    rollbackMock.mockRejectedValue(new Error('批次不存在'))
    const onRolledBack = vi.fn()

    act(() => {
      root.render(
        createElement(MaterialBatchRollbackButton, {
          importBatchNo: '404',
          onRolledBack,
        }),
      )
    })
    await flushAsync()

    const button = [...document.querySelectorAll('button')].find((element) =>
      element.textContent?.includes('回滚该批次'),
    )
    act(() => {
      button?.click()
    })
    await flushAsync()

    expect(messageMock.error).toHaveBeenCalledTimes(1)
    expect(onRolledBack).not.toHaveBeenCalled()
  })
})
