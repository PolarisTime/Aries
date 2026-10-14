// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialImportPreviewResponse } from '@/api/master/materials'
import { MaterialImportPreviewModal } from './MaterialImportPreviewModal'

const preview: MaterialImportPreviewResponse = {
  totalRows: 2,
  createdCount: 1,
  updatedCount: 1,
  skippedCount: 0,
  failedCount: 0,
  rows: [
    {
      rowNumber: 1,
      materialCode: null,
      brand: '宝钢',
      material: '螺纹钢',
      spec: 'HRB400',
      length: '9m',
      outcome: 'CREATED',
      materialId: null,
      changes: [{ field: 'brand', label: '品牌', before: null, after: '宝钢' }],
      reason: null,
    },
    {
      rowNumber: 2,
      materialCode: 'M-1',
      brand: '沙钢',
      material: '螺纹钢',
      spec: 'HRB400',
      length: '9m',
      outcome: 'UPDATED',
      materialId: '100000000000000002',
      changes: [
        { field: 'brand', label: '品牌', before: '宝钢', after: '沙钢' },
      ],
      reason: null,
    },
  ],
}

describe('MaterialImportPreviewModal', () => {
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

  const renderModal = (
    onConfirm: () => void,
    options: {
      importing?: boolean
      onCancel?: () => void
      preview?: MaterialImportPreviewResponse
    } = {},
  ) => {
    act(() => {
      root.render(
        createElement(MaterialImportPreviewModal, {
          open: true,
          preview: options.preview ?? preview,
          fileName: 'materials.xlsx',
          importing: options.importing ?? false,
          onCancel: options.onCancel ?? (() => {}),
          onConfirm,
        }),
      )
    })
  }

  it('展示每行新建/更新结果与字段差异', async () => {
    renderModal(() => {})
    await flushAsync()

    const text = document.body.textContent ?? ''
    expect(text).toContain('新增')
    expect(text).toContain('更新')
    expect(text).toContain('宝钢')
    expect(text).toContain('沙钢')
  })

  it('确认后触发正式导入回调', async () => {
    const onConfirm = vi.fn()
    renderModal(onConfirm)
    await flushAsync()

    const confirmButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.includes('确认导入'),
    )
    expect(confirmButton).toBeTruthy()
    act(() => {
      confirmButton?.click()
    })

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('用覆盖层容器尺寸呈现，而不是挂在 body 上、高度随内容长的 antd Modal', async () => {
    renderModal(() => {})
    await flushAsync()

    const overlay = document.querySelector('.workspace-overlay')
    expect(overlay).toBeTruthy()
    const panel = document.querySelector(
      '.workspace-overlay-panel.workspace-overlay-panel--form-dialog.workspace-overlay-panel--import-preview',
    )
    expect(panel).toBeTruthy()
    // 尺寸与滚动三件套：面板自身 overflow: hidden，滚动交给 body
    expect(panel?.querySelector('.workspace-overlay-header')).toBeTruthy()
    expect(panel?.querySelector('.workspace-overlay-body')).toBeTruthy()
    expect(panel?.querySelector('.workspace-overlay-footer')).toBeTruthy()
    // 面板必须在覆盖层内部：antd Modal 会把节点挂到 body，脱离覆盖层容器
    expect(panel?.closest('.workspace-overlay')).toBe(overlay)
    expect(document.querySelectorAll('.ant-modal').length).toBe(0)
  })

  it('字段差异的 18 位雪花编码完整渲染（不截断、不省略）', async () => {
    const longCode = '368804140140281280'
    renderModal(() => {}, {
      preview: {
        ...preview,
        rows: [
          {
            ...preview.rows[0],
            materialCode: longCode,
            changes: [
              {
                field: 'materialCode',
                label: '商品编码',
                before: null,
                after: longCode,
              },
            ],
          },
        ],
      },
    })
    await flushAsync()

    const cell = document.querySelector(
      '.material-import-rows-table tbody td:last-child',
    )
    expect(cell?.textContent).toContain(longCode)
    // 长文本靠 material-import-overlay.css 的 overflow-wrap 换行，列必须有该类
    expect(document.querySelector('.material-import-rows-table')).toBeTruthy()
  })

  it('正式导入进行中不允许通过取消/遮罩/Escape 关闭预览', async () => {
    const onCancel = vi.fn()
    renderModal(() => {}, { importing: true, onCancel })
    await flushAsync()

    act(() => {
      document
        .querySelector<HTMLButtonElement>('.workspace-overlay-mask')
        ?.click()
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
    })
    await flushAsync()

    expect(onCancel).not.toHaveBeenCalled()
  })
})
