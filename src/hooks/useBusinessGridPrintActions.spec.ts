import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { httpMock, assertApiSuccessMock, listPrintTemplatesMock, messageWarningMock,
  messageErrorMock, loadCLodopMock, execPrintCodeMock, printHtmlMock,
  renderPrintTemplateMock, modalConfirmMock, tMock } = vi.hoisted(() => ({
  httpMock: { post: vi.fn() },
  assertApiSuccessMock: vi.fn(),
  listPrintTemplatesMock: vi.fn(),
  messageWarningMock: vi.fn(),
  messageErrorMock: vi.fn(),
  loadCLodopMock: vi.fn().mockResolvedValue(undefined),
  execPrintCodeMock: vi.fn().mockReturnValue(true),
  printHtmlMock: vi.fn().mockReturnValue(true),
  renderPrintTemplateMock: vi.fn().mockReturnValue({ type: 'HTML', html: '<div>test</div>' }),
  modalConfirmMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: httpMock,
}))

vi.mock('@/api/print-template', () => ({
  listPrintTemplates: listPrintTemplatesMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: messageWarningMock, error: messageErrorMock },
  modal: { confirm: modalConfirmMock },
}))

vi.mock('@/utils/clodop', () => ({
  loadCLodop: loadCLodopMock,
  execPrintCode: execPrintCodeMock,
  printHtml: printHtmlMock,
}))

vi.mock('@/utils/print-template', () => ({
  renderPrintTemplate: renderPrintTemplateMock,
}))

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetMap: { 'sales-order': true },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock }),
}))

import { useBusinessGridPrintActions } from './useBusinessGridPrintActions'

describe('useBusinessGridPrintActions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns handlePrintSelectedRecords function', () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    expect(result.current.handlePrintSelectedRecords).toBeDefined()
  })

  it('shows warning when no rows selected', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: [] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false)
    })
    expect(messageWarningMock).toHaveBeenCalledWith('common.pleaseSelect')
  })

  it('shows warning when no template configured', async () => {
    listPrintTemplatesMock.mockResolvedValue({ data: [] })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false)
    })
    expect(messageWarningMock).toHaveBeenCalledWith('hooks.printActions.noPrintTemplateConfigured')
  })

  it('prints using provided template', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: '<div>{{name}}</div>',
      templateType: 'HTML',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'HTML',
        templateHtml: '<div>Test</div>',
        data: { name: 'Test' },
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-1',
      moduleKey: 'sales-order',
      recordId: '1',
    })
  })

  it('handles multiple selected rows', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: '<div>{{name}}</div>',
      templateType: 'HTML',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'HTML',
        templateHtml: '<div>Test</div>',
        data: { name: 'Test' },
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1', '2', '3'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(httpMock.post).toHaveBeenCalledTimes(3)
  })

  it('shows error message on failure', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: '<div>{{name}}</div>',
      templateType: 'HTML',
    }
    httpMock.post.mockRejectedValue(new Error('Print failed'))

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(messageErrorMock).toHaveBeenCalled()
  })

  it('handles PDF_FORM template type', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'PDF_FORM',
        pdfBase64: btoa('pdf-content'),
        contentType: 'application/pdf',
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(httpMock.post).toHaveBeenCalled()
  })

  it('handles preview mode for PDF', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'PDF_FORM',
        pdfBase64: btoa('pdf-content'),
        contentType: 'application/pdf',
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(true, template)
    })

    expect(httpMock.post).toHaveBeenCalled()
  })

  it('handles COORD template type', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: '<div>test</div>',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: '<div>test</div>',
        templateName: 'Coord Template',
        data: {},
      },
    })
    renderPrintTemplateMock.mockReturnValue({
      type: 'COORD',
      script: 'test-script',
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(execPrintCodeMock).toHaveBeenCalled()
  })

  it('shows warning when no print content generated', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Empty Template',
      templateHtml: '<div>test</div>',
      templateType: 'HTML',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'HTML',
        templateHtml: null,
      },
    })
    renderPrintTemplateMock.mockReturnValue({ type: 'HTML', html: null })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(messageWarningMock).toHaveBeenCalledWith('hooks.printActions.noPrintContent')
  })

  it('handles printHtml returning false', async () => {
    const template = {
      id: 'template-1',
      templateName: 'HTML Template',
      templateHtml: '<div>test</div>',
      templateType: 'HTML',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'HTML',
        templateHtml: '<div>test</div>',
        templateName: 'HTML Template',
        data: {},
      },
    })
    renderPrintTemplateMock.mockReturnValue({
      type: 'HTML',
      html: '<div>test</div>',
    })
    printHtmlMock.mockReturnValue(false)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(messageErrorMock).toHaveBeenCalledWith('hooks.printActions.printServiceUnavailable')
  })

  it('normalizes axios error with blob response', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test',
      templateHtml: '<div>test</div>',
      templateType: 'HTML',
    }
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        data: new Blob([JSON.stringify({ message: 'Server error' })], {
          type: 'application/json',
        }),
      },
    })
    httpMock.post.mockRejectedValue(axiosError)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({ moduleKey: 'sales-order', selectedRowKeys: ['1'] })
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords(false, template)
    })

    expect(messageErrorMock).toHaveBeenCalled()
  })
})
