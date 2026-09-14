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

  const renderModal = (onConfirm: () => void) => {
    act(() => {
      root.render(
        createElement(MaterialImportPreviewModal, {
          open: true,
          preview,
          fileName: 'materials.xlsx',
          importing: false,
          onCancel: () => {},
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
})
