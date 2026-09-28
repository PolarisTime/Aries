// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listPrintTemplatesMock,
  renderPrintRecordMock,
  runPrintOutputsMock,
  pickDefaultPrintTemplateMock,
  filterPrintTemplatesBySettlementCompanyMock,
  supportsRecordIdExportMock,
  exportModuleRecordsByIdsMock,
  messageWarningMock,
  messageErrorMock,
  messageSuccessMock,
} = vi.hoisted(() => ({
  listPrintTemplatesMock: vi.fn(),
  renderPrintRecordMock: vi.fn(),
  runPrintOutputsMock: vi.fn(),
  pickDefaultPrintTemplateMock: vi.fn(),
  filterPrintTemplatesBySettlementCompanyMock: vi.fn(
    (templates: unknown[]) => templates,
  ),
  supportsRecordIdExportMock: vi.fn(() => true),
  exportModuleRecordsByIdsMock: vi.fn(),
  messageWarningMock: vi.fn(),
  messageErrorMock: vi.fn(),
  messageSuccessMock: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: messageWarningMock,
    error: messageErrorMock,
    success: messageSuccessMock,
  },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/api/business/common-export', () => ({
  supportsRecordIdExport: supportsRecordIdExportMock,
  exportModuleRecordsByIds: exportModuleRecordsByIdsMock,
}))

vi.mock('@/api/system/print-template', () => ({
  listPrintTemplates: listPrintTemplatesMock,
  renderPrintRecord: renderPrintRecordMock,
  exportSalesOrderPrintXlsx: vi.fn(),
}))

vi.mock('@/utils/print-output-runner', () => ({
  runPrintOutputs: runPrintOutputsMock,
}))

vi.mock('@/utils/print-template', () => ({
  pickDefaultPrintTemplate: pickDefaultPrintTemplateMock,
}))

vi.mock('@/utils/print-template-settlement', () => ({
  filterPrintTemplatesBySettlementCompany:
    filterPrintTemplatesBySettlementCompanyMock,
}))

vi.mock('@/components/PrintTemplateSelector', () => ({
  PrintTemplateSelector: () => null,
}))

import { useBusinessGridPrintActions } from '@/hooks/useBusinessGridPrintActions'
import type { ModuleRecord } from '@/types/module-page'

const TEMPLATE = {
  id: 'template-1',
  templateName: '销售出库单默认模板',
  templateType: 'PDF_FORM',
  templateHtml: '<div></div>',
  status: 'ACTIVE',
}

describe('useBusinessGridPrintActions.handleExportSelectedRecords 导出选中记录', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useBusinessGridPrintActions>
  let selectedRowKeys: string[]
  let selectedRows: ModuleRecord[]
  let moduleKey: string

  function Probe() {
    latest = useBusinessGridPrintActions({
      moduleKey,
      selectedRowKeys,
      selectedRows,
    })
    return null
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    moduleKey = 'sales-outbound'
    selectedRowKeys = []
    selectedRows = []
    listPrintTemplatesMock.mockReset()
    renderPrintRecordMock.mockReset()
    runPrintOutputsMock.mockReset()
    pickDefaultPrintTemplateMock.mockReset()
    supportsRecordIdExportMock.mockReset()
    exportModuleRecordsByIdsMock.mockReset()
    messageWarningMock.mockReset()
    messageErrorMock.mockReset()
    messageSuccessMock.mockReset()

    supportsRecordIdExportMock.mockReturnValue(true)
    exportModuleRecordsByIdsMock.mockResolvedValue(undefined)
    listPrintTemplatesMock.mockResolvedValue([TEMPLATE])
    pickDefaultPrintTemplateMock.mockReturnValue(TEMPLATE)
    renderPrintRecordMock.mockResolvedValue({ kind: 'PDF', pdfBase64: 'AA==' })
    runPrintOutputsMock.mockResolvedValue({ pdfCount: 1, coordCount: 0 })

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => {
      root.render(createElement(Probe))
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const renderWithSelection = (keys: string[]) => {
    selectedRowKeys = keys
    selectedRows = keys.map((key) => ({ id: key }))
    act(() => {
      root.render(createElement(Probe))
    })
  }

  it('无勾选时不发起任何导出请求', async () => {
    renderWithSelection([])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(exportModuleRecordsByIdsMock).not.toHaveBeenCalled()
    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith('common.pleaseSelect')
  })

  it('走服务端按 id 导出：请求体只含勾选 id，且不进入打印链路', async () => {
    renderWithSelection(['101', '205', '309'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(true)
    })

    expect(exportModuleRecordsByIdsMock).toHaveBeenCalledTimes(1)
    expect(exportModuleRecordsByIdsMock).toHaveBeenCalledWith(
      'sales-outbound',
      ['101', '205', '309'],
    )
    // 未选中的记录绝不进入导出集合
    expect(exportModuleRecordsByIdsMock.mock.calls[0][1]).not.toContain('999')
    // 拿到的应是 xlsx，不再逐条渲染打印记录
    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(runPrintOutputsMock).not.toHaveBeenCalled()
    expect(messageSuccessMock).toHaveBeenCalledWith(
      'hooks.printActions.exportSelectedXlsxSuccess',
    )
  })

  it('勾选 key 去重后每条记录只导出一次', async () => {
    renderWithSelection(['101', '101', '205'])

    await act(async () => {
      await latest.handleExportSelectedRecords()
    })

    expect(exportModuleRecordsByIdsMock).toHaveBeenCalledWith(
      'sales-outbound',
      ['101', '205'],
    )
  })

  it('按 id 导出失败时报错，不回退导出整页或打印链路', async () => {
    exportModuleRecordsByIdsMock.mockRejectedValue(new Error('boom'))
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(messageErrorMock).toHaveBeenCalledWith('boom')
    expect(renderPrintRecordMock).not.toHaveBeenCalled()
  })

  it('模块没有服务端按 id 导出端点时保留打印链路回落', async () => {
    supportsRecordIdExportMock.mockReturnValue(false)
    renderWithSelection(['101', '205'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(true)
    })

    expect(exportModuleRecordsByIdsMock).not.toHaveBeenCalled()
    expect(renderPrintRecordMock).toHaveBeenCalledTimes(2)
    expect(renderPrintRecordMock.mock.calls.map((call) => call[2])).toEqual([
      '101',
      '205',
    ])
    expect(runPrintOutputsMock).toHaveBeenCalledTimes(1)
    expect(runPrintOutputsMock.mock.calls[0][1]).toMatchObject({
      mode: 'download',
      fallbackTemplateName: TEMPLATE.templateName,
    })
  })

  it('两条路都不支持时给出明确提示，不回退导出整页', async () => {
    supportsRecordIdExportMock.mockReturnValue(false)
    moduleKey = 'material'
    selectedRowKeys = ['101']
    selectedRows = [{ id: '101' }]
    act(() => {
      root.render(createElement(Probe))
    })

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(exportModuleRecordsByIdsMock).not.toHaveBeenCalled()
    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.exportSelectedUnsupported',
    )
  })

  it('回落链路未配置打印模板时不导出', async () => {
    supportsRecordIdExportMock.mockReturnValue(false)
    listPrintTemplatesMock.mockResolvedValue([])
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintTemplateConfigured',
    )
  })

  it('回落链路模板无可下载内容时提示未生成打印内容', async () => {
    supportsRecordIdExportMock.mockReturnValue(false)
    runPrintOutputsMock.mockResolvedValue({ pdfCount: 0, coordCount: 0 })
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintContent',
    )
  })

  it('回落链路渲染失败时报错并返回 false', async () => {
    supportsRecordIdExportMock.mockReturnValue(false)
    renderPrintRecordMock.mockRejectedValue(new Error('boom'))
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(messageErrorMock).toHaveBeenCalledWith('boom')
  })
})
