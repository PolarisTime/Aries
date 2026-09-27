// @vitest-environment jsdom

import { act, createElement, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getAttachmentBindingsMock,
  uploadAttachmentMock,
  updateAttachmentBindingsMock,
  messageSuccessMock,
  messageErrorMock,
} = vi.hoisted(() => ({
  getAttachmentBindingsMock: vi.fn(),
  uploadAttachmentMock: vi.fn(),
  updateAttachmentBindingsMock: vi.fn(),
  messageSuccessMock: vi.fn(),
  messageErrorMock: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: messageSuccessMock, error: messageErrorMock },
}))

vi.mock('@/api/business/business-attachments', () => ({
  getAttachmentBindings: getAttachmentBindingsMock,
  uploadAttachment: uploadAttachmentMock,
  updateAttachmentBindings: updateAttachmentBindingsMock,
  getAttachmentBlob: vi.fn(),
  getPresignedAttachmentBlob: vi.fn(),
  resolveAttachmentAccessUrl: vi.fn(),
}))

import { useModuleAttachmentModal } from './useModuleAttachmentModal'

interface HarnessProps {
  latest: { current: ReturnType<typeof useModuleAttachmentModal> | null }
}

function Harness({ latest }: HarnessProps) {
  const modal = useModuleAttachmentModal({
    open: true,
    moduleKey: 'sales-order',
    recordId: '9',
  })
  latest.current = modal
  const zoneRef = useRef<HTMLDivElement | null>(null)
  // 复用真实 hook 的 pasteZoneRef，模拟附件弹窗的上传区域
  return createElement(
    'div',
    null,
    createElement('div', { ref: zoneRef, id: 'outer' }, 'drop-zone'),
    createElement(
      'div',
      { ref: modal.pasteZoneRef, id: 'paste-zone' },
      createElement('span', { id: 'paste-target' }, 'target'),
    ),
  )
}

function dispatchPasteOn(
  target: HTMLElement,
  files: File[],
  items?: unknown[],
) {
  const event = new Event('paste', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clipboardData', {
    configurable: true,
    value: {
      files,
      items:
        items ??
        files.map((file) => ({
          kind: 'file',
          getAsFile: () => file,
        })),
    },
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

describe('useModuleAttachmentModal Ctrl+V 粘贴上传', () => {
  let container: HTMLDivElement
  let root: Root
  let latest: { current: ReturnType<typeof useModuleAttachmentModal> | null }

  beforeEach(async () => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    getAttachmentBindingsMock.mockReset()
    uploadAttachmentMock.mockReset()
    updateAttachmentBindingsMock.mockReset()
    messageSuccessMock.mockReset()
    messageErrorMock.mockReset()

    getAttachmentBindingsMock.mockResolvedValue({ attachments: [] })
    uploadAttachmentMock.mockResolvedValue({ id: 'att-1' })
    updateAttachmentBindingsMock.mockResolvedValue(undefined)

    latest = { current: null }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    // 首屏的附件列表请求在挂载后异步返回，需在同一 act 内排空
    await act(async () => {
      root.render(createElement(Harness, { latest }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('粘贴区域内粘贴文件仍会上传并绑定', async () => {
    const target = container.querySelector<HTMLElement>('#paste-target')
    expect(target).not.toBeNull()

    const file = new File(['x'], 'pasted.png', { type: 'image/png' })
    let pasteEvent: Event | undefined
    await act(async () => {
      pasteEvent = dispatchPasteOn(target as HTMLElement, [file])
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(pasteEvent?.defaultPrevented).toBe(true)
    expect(uploadAttachmentMock).toHaveBeenCalledTimes(1)
    expect((uploadAttachmentMock.mock.calls[0][0] as File).name).toBe(
      'pasted.png',
    )
    expect(updateAttachmentBindingsMock).toHaveBeenCalledWith(
      'sales-order',
      '9',
      ['att-1'],
    )
  })

  it('粘贴多个文件时逐个串行上传，共享进度不互相覆盖', async () => {
    const target = container.querySelector<HTMLElement>('#paste-target')
    const files = [
      new File(['1'], 'p1.png'),
      new File(['2'], 'p2.png'),
      new File(['3'], 'p3.png'),
    ]

    await act(async () => {
      dispatchPasteOn(target as HTMLElement, files)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(uploadAttachmentMock).toHaveBeenCalledTimes(3)
    expect(
      uploadAttachmentMock.mock.calls.map((call) => (call[0] as File).name),
    ).toEqual(['p1.png', 'p2.png', 'p3.png'])
  })

  it('粘贴区域之外的粘贴事件被忽略', async () => {
    const outside = container.querySelector<HTMLElement>('#outer')
    const file = new File(['x'], 'outside.png', { type: 'image/png' })

    await act(async () => {
      dispatchPasteOn(outside as HTMLElement, [file])
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(uploadAttachmentMock).not.toHaveBeenCalled()
  })

  it('剪贴板没有文件时不触发上传', async () => {
    const target = container.querySelector<HTMLElement>('#paste-target')

    await act(async () => {
      dispatchPasteOn(target as HTMLElement, [])
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(uploadAttachmentMock).not.toHaveBeenCalled()
  })
})
