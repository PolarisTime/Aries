// @vitest-environment jsdom

import { act, createElement, createRef, type RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AttachmentUploadZone } from './AttachmentUploadZone'

function createFile(name: string) {
  return new File(['x'], name, { type: 'image/png' })
}

/** 排空上传组件内部的状态更新（antd 在 change/drop 的微任务里 setState）。 */
async function flushUploadState() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function dispatchFileInput(container: HTMLElement, files: File[]) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found')
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  })
  act(() => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  return input
}

describe('AttachmentUploadZone 附件拖拽多选上传', () => {
  let container: HTMLDivElement
  let root: Root
  let pasteZoneRef: RefObject<HTMLDivElement | null>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    pasteZoneRef = createRef<HTMLDivElement>()
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
    onUpload: (file: File) => void
    uploading?: boolean
    uploadProgress?: number
  }) => {
    act(() => {
      root.render(
        createElement(AttachmentUploadZone, {
          uploading: props.uploading ?? false,
          uploadFileName: 'a.png',
          uploadProgress: props.uploadProgress ?? 0,
          pasteZoneRef,
          onUpload: props.onUpload,
          t: (key: string, options?: Record<string, unknown>) =>
            options ? `${key}:${String(options.percent)}` : key,
        }),
      )
    })
  }

  it('使用 Upload.Dragger 并开启 multiple', () => {
    render({ onUpload: vi.fn() })

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    expect(input?.multiple).toBe(true)
    // Dragger 的拖放容器与内置可访问触发区都在
    expect(container.querySelector('.ant-upload-drag')).not.toBeNull()
    expect(
      container.querySelector('.module-attachment-upload-dragger'),
    ).not.toBeNull()
    expect(
      container.querySelector('.ant-upload-btn')?.getAttribute('role'),
    ).toBe('button')
  })

  it('多选文件时逐文件上报回调', async () => {
    const onUpload = vi.fn()
    render({ onUpload })

    dispatchFileInput(container, [
      createFile('a.png'),
      createFile('b.png'),
      createFile('c.png'),
    ])

    expect(onUpload).toHaveBeenCalledTimes(3)
    expect(onUpload.mock.calls.map((call) => (call[0] as File).name)).toEqual([
      'a.png',
      'b.png',
      'c.png',
    ])
    await flushUploadState()
  })

  it('拖放多个文件同样逐文件上报', async () => {
    const onUpload = vi.fn()
    render({ onUpload })

    // rc-upload 的 onDrop 挂在内层可访问触发区（.ant-upload-btn），事件再冒泡到拖放容器
    const dropZone = container.querySelector<HTMLElement>('.ant-upload-btn')
    expect(dropZone).not.toBeNull()
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', {
      configurable: true,
      value: { files: [createFile('d.png'), createFile('e.png')], items: [] },
    })

    await act(async () => {
      dropZone?.dispatchEvent(dropEvent)
      await Promise.resolve()
    })
    await flushUploadState()

    expect(onUpload).toHaveBeenCalledTimes(2)
    expect(onUpload.mock.calls.map((call) => (call[0] as File).name)).toEqual([
      'd.png',
      'e.png',
    ])
  })

  it('同一文件再次选择会重新上报（失败重试通道保持可用）', async () => {
    const onUpload = vi.fn()
    render({ onUpload })

    dispatchFileInput(container, [createFile('retry.png')])
    await flushUploadState()
    dispatchFileInput(container, [createFile('retry.png')])

    expect(onUpload).toHaveBeenCalledTimes(2)
    await flushUploadState()
  })

  it('外层容器仍挂 pasteZoneRef（Ctrl+V 粘贴上传区域不变）', () => {
    render({ onUpload: vi.fn() })

    expect(pasteZoneRef.current).not.toBeNull()
    expect(pasteZoneRef.current?.className).toContain(
      'module-attachment-upload-shell',
    )
    // 拖拽区位于粘贴区域内，粘贴监听仍能命中
    expect(
      pasteZoneRef.current?.querySelector('.ant-upload-drag'),
    ).not.toBeNull()
  })

  it('上传中展示当前文件与进度，空闲时展示上传提示', () => {
    render({ onUpload: vi.fn(), uploading: true, uploadProgress: 42 })

    expect(container.textContent).toContain(
      'modules.attachment.uploadingProgress:42',
    )
    expect(container.querySelector('.ant-progress')).not.toBeNull()

    render({ onUpload: vi.fn(), uploading: false })
    expect(container.textContent).toContain('modules.attachment.uploadHint')
    expect(container.querySelector('.ant-progress')).toBeNull()
  })
})
