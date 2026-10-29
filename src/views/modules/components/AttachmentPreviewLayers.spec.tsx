// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AttachmentPreviewLayers } from './AttachmentPreviewLayers'

/**
 * 三级弹窗（PDF 预览）的层级契约。
 *
 * <p>三级预览开在「附件弹层（2 级）→ 预览」这一层：必须带 3 级类名与更深的遮罩，
 * 否则和 2 级看起来一样重；宽度用统一常量 1104，不各写一份。</p>
 */
describe('附件 PDF 预览（3 级弹层）', () => {
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
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
  })

  it('PDF 预览带 3 级类名、宽度 1104，并保留顶部对齐的查看器定位', async () => {
    await act(async () => {
      root.render(
        createElement(AttachmentPreviewLayers, {
          imageAttachments: [],
          pdfPreviewOpen: true,
          pdfPreviewUrl: 'blob:mock',
          previewOpen: false,
          previewSource: '',
          previewUrlByAttachmentId: {},
          onPdfPreviewClose: () => {},
          onImagePreviewChange: () => {},
          t: (key: string) => key,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const modal = document.querySelector('.ant-modal')
    expect(modal).not.toBeNull()
    expect(modal?.className).toContain('app-dialog--level-3')
    // 查看器保留顶部对齐（modal-top-20），层级类与它合并而不是覆盖
    expect(modal?.className).toContain('modal-top-20')
    expect((modal as HTMLElement).style.width).toBe('1104px')
    expect(
      (document.querySelector('.ant-modal-root') as HTMLElement).className,
    ).toContain('app-dialog-root--level-3')
  })
})
