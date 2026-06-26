import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  httpMock,
  assertApiSuccessMock,
  exportSalesOrderPrintXlsxMock,
  listPrintTemplatesMock,
  messageWarningMock,
  messageErrorMock,
  downloadBlobMock,
  runPrintOutputsMock,
  modalConfirmMock,
  tMock,
} = vi.hoisted(() => ({
  httpMock: { post: vi.fn() },
  assertApiSuccessMock: vi.fn(),
  exportSalesOrderPrintXlsxMock: vi.fn(),
  listPrintTemplatesMock: vi.fn(),
  messageWarningMock: vi.fn(),
  messageErrorMock: vi.fn(),
  downloadBlobMock: vi.fn(),
  runPrintOutputsMock: vi.fn(),
  modalConfirmMock: vi.fn(),
  tMock: vi.fn((key: string) => key),
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

vi.mock('@/utils/download', () => ({
  downloadBlob: downloadBlobMock,
}))

vi.mock('@/utils/print-output-runner', () => ({
  runPrintOutputs: runPrintOutputsMock,
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
    tMock.mockImplementation((key: string) => key)
    runPrintOutputsMock.mockResolvedValue({ coordCount: 1, pdfCount: 0 })
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
      await result.current.handleExportSalesOrderPrintXlsx({
        hideUnitPrice: true,
        hideRemark: true,
        brandOverridesByItemId: { '1': '抚新' },
      })
    })

    expect(exportSalesOrderPrintXlsxMock).toHaveBeenCalledWith('1', {
      printOptions: {
        hideUnitPrice: true,
        hideRemark: true,
        brandOverridesByItemId: { '1': '抚新' },
      },
    })
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
        kind: 'PDF',
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
        kind: 'LODOP_SCRIPT',
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
        kind: 'LODOP_SCRIPT',
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
        hideRemark: true,
        brandOverride: '沙钢',
      })
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-1',
      moduleKey: 'sales-order',
      recordId: '1',
      printOptions: {
        hideUnitPrice: true,
        hideRemark: true,
        brandOverride: '沙钢',
      },
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
        kind: 'LODOP_SCRIPT',
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

  it('delegates PDF_FORM output to runner', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    const output = {
      kind: 'PDF',
      templateType: 'PDF_FORM',
      pdfBase64: btoa('pdf-content'),
      contentType: 'application/pdf',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: output,
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
    expect(runPrintOutputsMock).toHaveBeenCalledWith([output], {
      fallbackTemplateName: 'PDF Template',
      mode: 'print',
      printServiceUnavailableMessage:
        'hooks.printActions.printServiceUnavailable',
    })
  })

  it('passes preview mode to runner', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        kind: 'PDF',
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
    expect(runPrintOutputsMock).toHaveBeenCalledWith(
      [
        {
          kind: 'PDF',
          templateType: 'PDF_FORM',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
        },
      ],
      {
        fallbackTemplateName: 'PDF Template',
        mode: 'preview',
        printServiceUnavailableMessage:
          'hooks.printActions.printServiceUnavailable',
      },
    )
  })

  it('does not warn when download mode runner returns PDF output', async () => {
    const template = {
      id: 'template-1',
      templateName: 'PDF Template',
      templateHtml: '',
      templateType: 'PDF_FORM',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        kind: 'PDF',
        templateType: 'PDF_FORM',
        pdfBase64: btoa('pdf-content'),
        contentType: 'application/pdf',
        fileName: 'sales-order',
      },
    })
    runPrintOutputsMock.mockResolvedValue({ coordCount: 0, pdfCount: 1 })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('download', template)
    })

    expect(runPrintOutputsMock).toHaveBeenCalledWith(
      [
        {
          kind: 'PDF',
          templateType: 'PDF_FORM',
          pdfBase64: btoa('pdf-content'),
          contentType: 'application/pdf',
          fileName: 'sales-order',
        },
      ],
      {
        fallbackTemplateName: 'PDF Template',
        mode: 'download',
        printServiceUnavailableMessage:
          'hooks.printActions.printServiceUnavailable',
      },
    )
    expect(messageWarningMock).not.toHaveBeenCalledWith(
      'hooks.printActions.noPrintContent',
    )
  })

  it('shows warning when download mode runner returns no PDF output', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        kind: 'LODOP_SCRIPT',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      },
    })
    runPrintOutputsMock.mockResolvedValue({ coordCount: 0, pdfCount: 0 })

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

  it('delegates COORD output to runner', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    const output = {
      kind: 'LODOP_SCRIPT',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateName: 'Coord Template',
      data: {},
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: output,
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

    expect(runPrintOutputsMock).toHaveBeenCalledWith([output], {
      fallbackTemplateName: 'Coord Template',
      mode: 'print',
      printServiceUnavailableMessage:
        'hooks.printActions.printServiceUnavailable',
    })
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
        kind: 'LODOP_SCRIPT',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
      },
    })
    runPrintOutputsMock.mockResolvedValue({ coordCount: 0, pdfCount: 0 })

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

  it('shows runner error message', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Coord Template',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    httpMock.post.mockResolvedValue({
      code: 200,
      data: {
        kind: 'LODOP_SCRIPT',
        templateType: 'COORD',
        templateHtml: 'LODOP.PRINT_INIT("test");',
        templateName: 'Coord Template',
        data: {},
      },
    })
    runPrintOutputsMock.mockRejectedValue(
      new Error('hooks.printActions.printServiceUnavailable'),
    )

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
