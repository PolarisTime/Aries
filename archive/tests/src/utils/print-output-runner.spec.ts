import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runPrintOutputs } from './print-output-runner'

const {
  downloadBlobMock,
  execPrintCodeMock,
  loadCLodopMock,
  renderPrintTemplateMock,
} = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
  execPrintCodeMock: vi.fn(),
  loadCLodopMock: vi.fn(),
  renderPrintTemplateMock: vi.fn(),
}))

vi.mock('@/utils/download', () => ({
  downloadBlob: downloadBlobMock,
}))

vi.mock('@/utils/clodop', () => ({
  execPrintCode: execPrintCodeMock,
  loadCLodop: loadCLodopMock,
}))

vi.mock('@/utils/print-template', () => ({
  renderPrintTemplate: renderPrintTemplateMock,
}))

describe('runPrintOutputs', () => {
  const createObjectURLMock = vi.fn()
  const revokeObjectURLMock = vi.fn()
  const windowOpenMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.resetAllMocks()
    createObjectURLMock.mockReturnValue('blob:print-output')
    execPrintCodeMock.mockReturnValue(true)
    loadCLodopMock.mockResolvedValue(undefined)
    renderPrintTemplateMock.mockReturnValue({
      type: 'COORD',
      script: 'LODOP.PRINT_INIT("test");',
    })
    vi.stubGlobal('URL', {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    })
    vi.spyOn(window, 'open').mockImplementation(windowOpenMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('opens PDF output in preview mode', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'PDF',
          templateType: 'PDF_FORM',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          fileName: 'sales-order.pdf',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'preview',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 0, pdfCount: 1 })
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob))
    expect(windowOpenMock).toHaveBeenCalledWith(
      'blob:print-output',
      '_blank',
      'noopener,noreferrer',
    )
    expect(downloadBlobMock).not.toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:print-output')
  })

  it('downloads PDF output and normalizes filename', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'PDF',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          fileName: 'sales-order',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'download',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 0, pdfCount: 1 })
    expect(downloadBlobMock).toHaveBeenCalledWith(
      expect.any(Blob),
      'sales-order.pdf',
    )
    expect(windowOpenMock).not.toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()
  })

  it('uses PDF template and fallback names when fileName is missing', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'PDF',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          templateName: 'Template Name',
        },
        {
          kind: 'PDF',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          fileName: '   ',
        },
        {
          kind: 'PDF',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'download',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 0, pdfCount: 3 })
    expect(downloadBlobMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Blob),
      'Template Name.pdf',
    )
    expect(downloadBlobMock).toHaveBeenNthCalledWith(
      2,
      expect.any(Blob),
      'print.pdf',
    )
    expect(downloadBlobMock).toHaveBeenNthCalledWith(
      3,
      expect.any(Blob),
      'Fallback.pdf',
    )
  })

  it('prints PDF output through a hidden iframe', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'PDF',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          fileName: 'sales-order.pdf',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'print',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    const frame = document.body.querySelector('iframe')
    const focusMock = vi.fn()
    const printMock = vi.fn()
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: {
        focus: focusMock,
        print: printMock,
      },
    })
    frame?.dispatchEvent(new Event('load'))

    expect(result).toEqual({ coordCount: 0, pdfCount: 1 })
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('src')).toBe('blob:print-output')
    expect(frame?.style.position).toBe('fixed')
    expect(focusMock).toHaveBeenCalled()
    expect(printMock).toHaveBeenCalled()
    expect(downloadBlobMock).not.toHaveBeenCalled()
    expect(windowOpenMock).not.toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(60_000)
    expect(document.body.querySelector('iframe')).toBeNull()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:print-output')
  })

  it('executes COORD output through C-Lodop', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'LODOP_SCRIPT',
          templateName: 'Coord Template',
          templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
          data: { name: 'SO-001' },
          items: [{ name: 'Item 1' }],
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'preview',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 1, pdfCount: 0 })
    expect(renderPrintTemplateMock).toHaveBeenCalledWith(
      'LODOP.PRINT_INIT("{{name}}");',
      'COORD',
      { name: 'SO-001' },
      [{ name: 'Item 1' }],
    )
    expect(loadCLodopMock).toHaveBeenCalledTimes(1)
    expect(execPrintCodeMock).toHaveBeenCalledWith(
      'LODOP.PRINT_INIT("test");',
      {
        preview: true,
        title: 'Coord Template',
      },
    )
  })

  it('returns empty counts when there is no runnable output', async () => {
    renderPrintTemplateMock.mockReturnValue({
      type: 'HTML',
      html: '<p>empty</p>',
    })

    const result = await runPrintOutputs(
      [
        {
          kind: 'LODOP_SCRIPT',
          templateHtml: '<p>{{name}}</p>',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'print',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 0, pdfCount: 0 })
    expect(downloadBlobMock).not.toHaveBeenCalled()
    expect(windowOpenMock).not.toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()
    expect(execPrintCodeMock).not.toHaveBeenCalled()
    expect(renderPrintTemplateMock).toHaveBeenCalled()
  })

  it('uses default COORD template data and fallback title', async () => {
    const result = await runPrintOutputs(
      [
        {
          kind: 'LODOP_SCRIPT',
          templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'print',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 1, pdfCount: 0 })
    expect(renderPrintTemplateMock).toHaveBeenCalledWith(
      'LODOP.PRINT_INIT("{{name}}");',
      'COORD',
      {},
      [],
    )
    expect(execPrintCodeMock).toHaveBeenCalledWith(
      'LODOP.PRINT_INIT("test");',
      {
        preview: false,
        title: 'Fallback',
      },
    )
  })

  it('loads C-Lodop but skips COORD output without script', async () => {
    renderPrintTemplateMock.mockReturnValue({
      type: 'COORD',
      script: '',
    })

    const result = await runPrintOutputs(
      [
        {
          kind: 'LODOP_SCRIPT',
          templateName: 'Coord Template',
          templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
        },
      ],
      {
        fallbackTemplateName: 'Fallback',
        mode: 'print',
        printServiceUnavailableMessage: 'print unavailable',
      },
    )

    expect(result).toEqual({ coordCount: 1, pdfCount: 0 })
    expect(loadCLodopMock).toHaveBeenCalledTimes(1)
    expect(execPrintCodeMock).not.toHaveBeenCalled()
  })

  it('throws when C-Lodop execution fails', async () => {
    execPrintCodeMock.mockReturnValue(false)

    await expect(
      runPrintOutputs(
        [
          {
            kind: 'LODOP_SCRIPT',
            templateName: 'Coord Template',
            templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
          },
        ],
        {
          fallbackTemplateName: 'Fallback',
          mode: 'print',
          printServiceUnavailableMessage: 'print unavailable',
        },
      ),
    ).rejects.toThrow('print unavailable')

    expect(loadCLodopMock).toHaveBeenCalledTimes(1)
    expect(execPrintCodeMock).toHaveBeenCalledWith(
      'LODOP.PRINT_INIT("test");',
      {
        preview: false,
        title: 'Coord Template',
      },
    )
  })
})
