// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialImportResponse } from '@/api/master/materials'
import { MaterialImportResultModal } from './MaterialImportResultModal'

const result: MaterialImportResponse = {
  totalRows: 2,
  successCount: 1,
  createdCount: 1,
  updatedCount: 0,
  skippedCount: 0,
  failedCount: 1,
  importBatchNo: 'B-20260909-0001',
  failures: [],
  rows: [
    {
      rowNumber: 1,
      materialCode: '368804140140281280',
      brand: '武钢襄钢',
      material: 'HRB400',
      spec: '12',
      length: '8米',
      outcome: 'CREATED',
      reason: null,
    },
    {
      rowNumber: 2,
      materialCode: null,
      brand: null,
      material: null,
      spec: null,
      length: null,
      outcome: 'FAILED',
      reason:
        '商品编码重复，且该行无法通过品牌 + 规格 + 长度匹配到已有商品资料',
    },
  ],
}

describe('MaterialImportResultModal', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
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

  const renderModal = (onClose: () => void) => {
    act(() => {
      root.render(
        createElement(MaterialImportResultModal, {
          open: true,
          result,
          importBatchNo: result.importBatchNo ?? null,
          onClose,
        }),
      )
    })
  }

  it('展示每行结果与失败原因，长原因完整渲染', async () => {
    renderModal(() => {})
    await flushAsync()

    const text = document.body.textContent ?? ''
    expect(text).toContain('新增')
    expect(text).toContain('失败')
    expect(text).toContain('368804140140281280')
    expect(text).toContain('商品编码重复')
  })

  it('与导入预览同口径：用覆盖层容器尺寸呈现，节点在覆盖层内部', async () => {
    renderModal(() => {})
    await flushAsync()

    const overlay = document.querySelector('.workspace-overlay')
    const panel = document.querySelector(
      '.workspace-overlay-panel.workspace-overlay-panel--form-dialog.workspace-overlay-panel--import-result',
    )
    expect(overlay).toBeTruthy()
    expect(panel).toBeTruthy()
    expect(panel?.closest('.workspace-overlay')).toBe(overlay)
    expect(document.querySelectorAll('.ant-modal').length).toBe(0)
    expect(document.querySelector('.material-import-rows-table')).toBeTruthy()
  })

  it('关闭回调可被触发', async () => {
    const onClose = vi.fn()
    renderModal(onClose)
    await flushAsync()

    // antd 会在两个汉字的按钮文案中间插空格（关 闭），这里放宽匹配
    const closeButton = [...document.querySelectorAll('button')].find(
      (button) => /关\s*闭/.test(button.textContent ?? ''),
    )
    expect(closeButton).toBeTruthy()
    act(() => {
      closeButton?.click()
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
