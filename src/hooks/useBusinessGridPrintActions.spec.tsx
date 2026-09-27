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
  messageWarningMock,
  messageErrorMock,
} = vi.hoisted(() => ({
  listPrintTemplatesMock: vi.fn(),
  renderPrintRecordMock: vi.fn(),
  runPrintOutputsMock: vi.fn(),
  pickDefaultPrintTemplateMock: vi.fn(),
  filterPrintTemplatesBySettlementCompanyMock: vi.fn(
    (templates: unknown[]) => templates,
  ),
  messageWarningMock: vi.fn(),
  messageErrorMock: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { warning: messageWarningMock, error: messageErrorMock },
  modal: { confirm: vi.fn() },
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

  function Probe() {
    latest = useBusinessGridPrintActions({
      moduleKey: 'sales-outbound',
      selectedRowKeys,
      selectedRows,
    })
    return null
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    selectedRowKeys = []
    selectedRows = []
    listPrintTemplatesMock.mockReset()
    renderPrintRecordMock.mockReset()
    runPrintOutputsMock.mockReset()
    pickDefaultPrintTemplateMock.mockReset()
    messageWarningMock.mockReset()
    messageErrorMock.mockReset()

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

  it('无勾选时不发起任何渲染请求', async () => {
    renderWithSelection([])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith('common.pleaseSelect')
  })

  it('导出目标只含勾选 id，逐条按 recordId 渲染', async () => {
    renderWithSelection(['101', '205', '309'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(true)
    })

    expect(renderPrintRecordMock).toHaveBeenCalledTimes(3)
    expect(renderPrintRecordMock.mock.calls.map((call) => call[2])).toEqual([
      '101',
      '205',
      '309',
    ])
    // 未选中的记录绝不进入导出集合
    expect(
      renderPrintRecordMock.mock.calls.map((call) => call[2]),
    ).not.toContain('999')
    expect(runPrintOutputsMock).toHaveBeenCalledTimes(1)
    expect(runPrintOutputsMock.mock.calls[0][1]).toMatchObject({
      mode: 'download',
      fallbackTemplateName: TEMPLATE.templateName,
    })
  })

  it('勾选 key 去重后每条记录只导出一次', async () => {
    renderWithSelection(['101', '101', '205'])

    await act(async () => {
      await latest.handleExportSelectedRecords()
    })

    expect(renderPrintRecordMock.mock.calls.map((call) => call[2])).toEqual([
      '101',
      '205',
    ])
  })

  it('模块不在打印模板白名单时明确提示，不回退导出整页', async () => {
    selectedRowKeys = ['101']
    selectedRows = [{ id: '101' }]
    function OtherProbe() {
      latest = useBusinessGridPrintActions({
        moduleKey: 'material',
        selectedRowKeys,
        selectedRows,
      })
      return null
    }
    act(() => {
      root.render(createElement(OtherProbe))
    })

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(renderPrintRecordMock).not.toHaveBeenCalled()
    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.exportSelectedUnsupported',
    )
  })

  it('未配置打印模板时不导出', async () => {
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

  it('模板无可下载内容时提示未生成打印内容', async () => {
    runPrintOutputsMock.mockResolvedValue({ pdfCount: 0, coordCount: 0 })
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(messageWarningMock).toHaveBeenCalledWith(
      'hooks.printActions.noPrintContent',
    )
  })

  it('渲染失败时报错并返回 false', async () => {
    renderPrintRecordMock.mockRejectedValue(new Error('boom'))
    renderWithSelection(['101'])

    await act(async () => {
      expect(await latest.handleExportSelectedRecords()).toBe(false)
    })

    expect(messageErrorMock).toHaveBeenCalledWith('boom')
  })
})
