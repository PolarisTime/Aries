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

interface PrintTemplateConfirmOptions {
  content: {
    props: {
      defaultId: string
      onSelect: (id: string) => void
    }
  }
  onOk: () => void
  onCancel: () => void
}

describe('useBusinessGridPrintActions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    tMock.mockImplementation((key: string) => key)
    runPrintOutputsMock.mockResolvedValue({ coordCount: 1, pdfCount: 0 })
  })

  async function openTemplatePicker(action: () => Promise<unknown>) {
    let actionPromise: Promise<unknown> = Promise.resolve()

    await act(async () => {
      actionPromise = action()
      await Promise.resolve()
    })

    const calls = modalConfirmMock.mock.calls
    const confirmOptions = calls[
      calls.length - 1
    ][0] as PrintTemplateConfirmOptions

    return { actionPromise, confirmOptions }
  }

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

  it('keeps an existing xlsx file extension when exporting', async () => {
    const blob = new Blob(['xlsx'])
    exportSalesOrderPrintXlsxMock.mockResolvedValue(blob)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
        selectedRows: [{ id: '1', orderNo: ' SO-001.XLSX ' }],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'SO-001.XLSX')
  })

  it('falls back to default xlsx file name for a null record id', async () => {
    const blob = new Blob(['xlsx'])
    exportSalesOrderPrintXlsxMock.mockResolvedValue(blob)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: [null as unknown as string],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(downloadBlobMock).toHaveBeenCalledWith(
      blob,
      'sales-order-print.xlsx',
    )
  })

  it('uses the selected record id when exporting without an order number', async () => {
    const blob = new Blob(['xlsx'])
    exportSalesOrderPrintXlsxMock.mockResolvedValue(blob)

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['record-1'],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(downloadBlobMock).toHaveBeenCalledWith(blob, 'record-1.xlsx')
  })

  it('shows warning when exporting print xlsx without selected rows', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: [],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(messageWarningMock).toHaveBeenCalledWith('common.pleaseSelect')
    expect(exportSalesOrderPrintXlsxMock).not.toHaveBeenCalled()
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

  it('shows error message when exporting print xlsx fails', async () => {
    exportSalesOrderPrintXlsxMock.mockRejectedValue(new Error('Export failed'))

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(messageErrorMock).toHaveBeenCalledWith('Export failed')
  })

  it('uses fallback export error message for non-error rejections', async () => {
    exportSalesOrderPrintXlsxMock.mockRejectedValue('Export failed')

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )

    await act(async () => {
      await result.current.handleExportSalesOrderPrintXlsx()
    })

    expect(messageErrorMock).toHaveBeenCalledWith(
      'hooks.printActions.exportXlsxFailed',
    )
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

  it('skips template loading for modules without print targets', async () => {
    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'purchase-order',
        selectedRowKeys: ['1'],
      }),
    )

    await act(async () => {
      await result.current.handlePrintSelectedRecords('print')
    })

    expect(listPrintTemplatesMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintTemplateConfigured',
    )
  })

  it('treats a missing template response as no configured templates', async () => {
    listPrintTemplatesMock.mockResolvedValue(undefined)

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

  it('opens a selector and prints with the chosen template', async () => {
    const templates = [
      {
        id: 'template-1',
        templateName: 'Template One',
        templateHtml: 'LODOP.PRINT_INIT("one");',
        templateType: 'COORD',
        status: 'ACTIVE',
        settlementCompanyId: 'company-1',
        settlementCompanyName: 'Acme',
      },
      {
        id: 'template-2',
        templateName: 'Template Two',
        templateHtml: 'LODOP.PRINT_INIT("two");',
        templateType: 'COORD',
        status: 'ACTIVE',
        settlementCompanyId: 'company-1',
        settlementCompanyName: 'Acme',
      },
    ]
    const output = {
      kind: 'LODOP_SCRIPT',
      templateType: 'COORD',
      templateHtml: 'LODOP.PRINT_INIT("two");',
      data: {},
    }
    listPrintTemplatesMock.mockResolvedValue({ data: templates })
    httpMock.post.mockResolvedValue({ code: 200, data: output })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
        selectedRows: [
          {
            id: '1',
            settlementCompanyId: 'company-1',
            settlementCompanyName: 'Acme',
          },
        ],
      }),
    )
    const { actionPromise, confirmOptions } = await openTemplatePicker(() =>
      result.current.handlePrintSelectedRecords('print'),
    )

    expect(confirmOptions.content.props.defaultId).toBe('template-1')

    await act(async () => {
      confirmOptions.content.props.onSelect('template-2')
      confirmOptions.onOk()
      await actionPromise
    })

    expect(httpMock.post).toHaveBeenCalledWith('/print/record', {
      templateId: 'template-2',
      moduleKey: 'sales-order',
      recordId: '1',
    })
    expect(runPrintOutputsMock).toHaveBeenCalledWith([output], {
      fallbackTemplateName: 'Template Two',
      mode: 'print',
      printServiceUnavailableMessage:
        'hooks.printActions.printServiceUnavailable',
    })
  })

  it('shows no template warning when selector is cancelled', async () => {
    const templates = [
      {
        id: 'template-1',
        templateName: 'Template One',
        templateHtml: 'LODOP.PRINT_INIT("one");',
        templateType: 'COORD',
      },
      {
        id: 'template-2',
        templateName: 'Template Two',
        templateHtml: 'LODOP.PRINT_INIT("two");',
        templateType: 'COORD',
      },
    ]
    listPrintTemplatesMock.mockResolvedValue({ data: templates })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    const { actionPromise, confirmOptions } = await openTemplatePicker(() =>
      result.current.handlePrintSelectedRecords('print'),
    )

    await act(async () => {
      confirmOptions.onCancel()
      await actionPromise
    })

    expect(httpMock.post).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintTemplateConfigured',
    )
  })

  it('shows no template warning when selector confirms a missing template id', async () => {
    const templates = [
      {
        id: 'template-1',
        templateName: 'Template One',
        templateHtml: 'LODOP.PRINT_INIT("one");',
        templateType: 'COORD',
      },
      {
        id: 'template-2',
        templateName: 'Template Two',
        templateHtml: 'LODOP.PRINT_INIT("two");',
        templateType: 'COORD',
      },
    ]
    listPrintTemplatesMock.mockResolvedValue({ data: templates })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    const { actionPromise, confirmOptions } = await openTemplatePicker(() =>
      result.current.handlePrintSelectedRecords('print'),
    )

    await act(async () => {
      confirmOptions.content.props.onSelect('missing')
      confirmOptions.onOk()
      await actionPromise
    })

    expect(httpMock.post).not.toHaveBeenCalled()
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

  it('warns and stops when download mode has only coord output', async () => {
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
    runPrintOutputsMock.mockResolvedValue({ coordCount: 1, pdfCount: 0 })

    const { result } = renderHook(() =>
      useBusinessGridPrintActions({
        moduleKey: 'sales-order',
        selectedRowKeys: ['1'],
      }),
    )
    await act(async () => {
      await result.current.handlePrintSelectedRecords('download', template)
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

  it('falls back to axios message when blob error has no message field', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        data: new Blob([JSON.stringify({ error: 'Server error' })], {
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

    expect(messageErrorMock).toHaveBeenCalledWith('Request failed')
  })

  it('uses fallback message when axios blob error has a blank message', async () => {
    const template = {
      id: 'template-1',
      templateName: 'Test',
      templateHtml: 'LODOP.PRINT_INIT("test");',
      templateType: 'COORD',
    }
    const axiosError = Object.assign(new Error(''), {
      isAxiosError: true,
      response: {
        data: new Blob([JSON.stringify({ message: '   ' })], {
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

    expect(messageErrorMock).toHaveBeenCalledWith(
      'hooks.printActions.printFailed',
    )
  })
})
