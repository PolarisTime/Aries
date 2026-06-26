import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  httpMock,
  assertApiSuccessMock,
  exportSalesOrderPrintXlsxMock,
  listPrintTemplatesMock,
  messageWarningMock,
  messageErrorMock,
  loadCLodopMock,
  execPrintCodeMock,
  downloadBlobMock,
  renderPrintTemplateMock,
  modalConfirmMock,
  tMock,
  windowOpenMock,
} = vi.hoisted(() => ({
  httpMock: { post: vi.fn() },
  assertApiSuccessMock: vi.fn(),
  exportSalesOrderPrintXlsxMock: vi.fn(),
  listPrintTemplatesMock: vi.fn(),
  messageWarningMock: vi.fn(),
  messageErrorMock: vi.fn(),
  loadCLodopMock: vi.fn().mockResolvedValue(undefined),
  execPrintCodeMock: vi.fn().mockReturnValue(true),
  downloadBlobMock: vi.fn(),
  renderPrintTemplateMock: vi
    .fn()
    .mockReturnValue({ type: 'COORD', script: 'LODOP.PRINT_INIT("test");' }),
  modalConfirmMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
  windowOpenMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: httpMock,
}))

vi.mock('@/api/print-template', () => ({
  exportSalesOrderPrintXlsx: exportSalesOrderPrintXlsxMock,
  listPrintTemplates: listPrintTemplatesMock,
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: messageWarningMock, error: messageErrorMock },
  modal: { confirm: modalConfirmMock },
}))

vi.mock('@/utils/clodop', () => ({
  loadCLodop: loadCLodopMock,
  execPrintCode: execPrintCodeMock,
}))

vi.mock('@/utils/print-template', () => ({
  renderPrintTemplate: renderPrintTemplateMock,
}))

vi.mock('@/utils/download', () => ({
  downloadBlob: downloadBlobMock,
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
    vi.spyOn(window, 'open').mockImplementation(windowOpenMock)
  })

  it('returns handlePrintSelectedRecords function', () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
        selectedRows: [{ id: '1', orderNo: 'SO/001' }],
      }),
    )
    expect(result.current.handlePrintSelectedRecords).toBeDefined()
  })

  it('shows warning when no rows selected', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: [],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print')
    })
    expect(messageWarningMock).toHaveBeenCalledWith('common.pleaseSelect')
  })

  it('exports sales order print xlsx for a single selected row', async () => {
    const blob = new Blob(['xlsx'])
    exportSalesOrderPrintXlsxMock.mockResolvedValue(blob)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
        selectedRows: [{ id: '1', orderNo: 'SO/001' }],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(exportSalesOrderPrintXlsxMock).toHaveBeenCalledWith('1')
    expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'SO_001.xlsx')
  })

  it('does not export print xlsx for non-sales-order modules', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['1'],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(exportSalesOrderPrintXlsxMock).not.toHaveBeenCalled()
  })

  it('shows warning when exporting print xlsx with multiple selected rows', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1', '2'],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.singleRecordOnly',
    )
    expect(exportSalesOrderPrintXlsxMock).not.toHaveBeenCalled()
  })

  it('shows warning when multiple rows selected', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
      templateType: 'COORD',
    }

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1', '2'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.singleRecordOnly',
    )
    expect(httpMock.post).not.toHaveBeenCalled()
  })

  it('shows warning when no template configured', async () => {
    listPrintTemplatesMock.mockResolvedValue({ data: [] })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print')
    })
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintTemplateConfigured',
    )
  })

  it('allows picking a PDF_FORM template without template html', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    listPrintTemplatesMock.mockResolvedValue({ data: [template] })
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'PDF_FORM',
        pdfBase64: btoa('pdf-content'),
        contentType: 'application/pdf',
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('preview')
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-1',
      moduleKey: 'sales-order',
      recordId: '1',
    })
  })

  it('prints using provided template', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("Test");',
        data: { name: 'Test' },
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-1',
      moduleKey: 'sales-order',
      recordId: '1',
    })
  })

  it('passes print options to backend', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("Test");',
        data: { name: 'Test' },
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template, {
        hideUnitPrice: true,
        brandOverride: '沙钢',
      })
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-1',
      moduleKey: 'sales-order',
      recordId: '1',
      printOptions: { hideUnitPrice: true, brandOverride: '沙钢' },
    })
  })

  it('blocks multiple selected rows', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("Test");',
        data: { name: 'Test' },
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1', '2', '3'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(httpMock.post).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.singleRecordOnly',
    )
  })

  it('shows error message on failure', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test Template',
      templateHtml: 'LODOP.PRINT_INIT("{{name}}");',
      templateType: 'COORD',
    }
    httpMock.post.mockRejectedValue(new Error('Print failed'))

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
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
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(httpMock.post).toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()
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
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('preview', template)
    })

    expect(httpMock.post).toHaveBeenCalled()
    expect(windowOpenMock).toHaveBeenCalled()
    expect(loadCLodopMock).not.toHaveBeenCalled()
  })

  it('downloads PDF_FORM template output', async () => {
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
        fileName: 'sales-order',
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('download', template)
    })

    expect(downloadBlobMock).toHaveBeenCalledWith(
      expect.any(Blob),
      'sales-order.pdf',
    )
    expect(loadCLodopMock).not.toHaveBeenCalled()
    expect(renderPrintTemplateMock).not.toHaveBeenCalled()
  })

  it('blocks download mode for non-PDF templates', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      },
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('download', template)
    })

    expect(httpMock.post).toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintContent',
    )
  })

  it('handles COORD template type', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        templateName: 'Coord Template',
        data: {},
      },
    })
    renderPrintTemplateMock.mockReturnValue({
      type: 'COORD',
      script: 'test-script',
    })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(execPrintCodeMock).toHaveBeenCalled()
    expect(loadCLodopMock).toHaveBeenCalled()
  })

  it('shows warning when no print content generated', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Empty Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: null,
      },
    })
    renderPrintTemplateMock.mockReturnValue({ type: 'COORD', script: '' })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintContent',
    )
  })

  it('handles execPrintCode returning false', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        templateName: 'Coord Template',
        data: {},
      },
    })
    renderPrintTemplateMock.mockReturnValue({
      type: 'COORD',
      script: 'LODOP.PRINT_INIT("test");',
    })
    execPrintCodeMock.mockReturnValue(false)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(messageErrorMock).toHaveBeenCalledWith(
      'hooks.printActions.printServiceUnavailable',
    )
  })

  it('normalizes axios error with blob response', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
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
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('print', template)
    })

    expect(messageErrorMock).toHaveBeenCalled()
  })
})
