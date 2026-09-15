// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import type { SalesOrderPrintXlsxOptions } from '@/api/system/print-template'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { createPrintJobOutputActions } from '@/views/modules/components/PrintJobModal'
import {
  isValidSplitPieceCount,
  resolveSplitPieceCount,
} from '@/views/modules/components/print-job-modal-state'

const template: PrintTemplateRecord = {
  id: 'template-1',
  templateName: '销售订单套打',
  templateHtml: '<html></html>',
  templateType: 'COORD',
}

function setup(
  overrides: {
    splitPieceCount?: number
    onExportPrintXlsx?: (
      options?: SalesOrderPrintXlsxOptions,
    ) => Promise<boolean>
  } = {},
) {
  const onPrint = vi.fn().mockResolvedValue(true)
  const dispatch = vi.fn()
  const actions = createPrintJobOutputActions({
    brandOverrideEnabled: false,
    brandOverridesByItemId: {},
    dispatch,
    hideRemark: false,
    hideUnitPrice: false,
    itemSelectionEnabled: false,
    mergeEquivalentItems: true,
    mergeEquivalentItemsAvailable: true,
    onPrint,
    orderedPrintItemIds: [],
    selectedItemIds: [],
    selectedTemplate: template,
    ...overrides,
  })
  return { actions, onPrint }
}

describe('拆分打印选项组装', () => {
  it('勾选且件数有效时，渲染与 xlsx 选项都携带 splitPieceCount', async () => {
    const onExportPrintXlsx = vi.fn().mockResolvedValue(true)
    const { actions, onPrint } = setup({
      splitPieceCount: 25,
      onExportPrintXlsx,
    })

    await actions.handlePrint('preview')
    expect(onPrint).toHaveBeenCalledWith(
      'preview',
      template,
      expect.objectContaining({ splitPieceCount: 25 }),
    )

    await actions.handleExportPrintXlsx()
    expect(onExportPrintXlsx).toHaveBeenCalledWith(
      expect.objectContaining({ splitPieceCount: 25 }),
    )
  })

  it('未勾选或件数无效时，选项不包含 splitPieceCount', async () => {
    const { actions, onPrint } = setup({ splitPieceCount: undefined })

    await actions.handlePrint('preview')
    const options = onPrint.mock.calls[0]?.[2] ?? {}
    expect(options).not.toHaveProperty('splitPieceCount')
  })
})

describe('resolveSplitPieceCount / isValidSplitPieceCount', () => {
  it('勾选且件数为正整数时返回件数', () => {
    expect(resolveSplitPieceCount(['enableSplitPrint'], 1)).toBe(1)
    expect(resolveSplitPieceCount(['enableSplitPrint'], 25)).toBe(25)
  })

  it('未勾选时不返回件数', () => {
    expect(resolveSplitPieceCount([], 25)).toBeUndefined()
    expect(resolveSplitPieceCount(['hideRemark'], 25)).toBeUndefined()
  })

  it('勾选但件数无效时不返回件数', () => {
    for (const value of [undefined, null, 0, -3, 2.5, Number.NaN, '25']) {
      expect(
        resolveSplitPieceCount(['enableSplitPrint'], value),
      ).toBeUndefined()
    }
  })

  it('isValidSplitPieceCount 仅接受 ≥1 的整数', () => {
    expect(isValidSplitPieceCount(1)).toBe(true)
    expect(isValidSplitPieceCount(25)).toBe(true)
    expect(isValidSplitPieceCount(0)).toBe(false)
    expect(isValidSplitPieceCount(-1)).toBe(false)
    expect(isValidSplitPieceCount(1.2)).toBe(false)
    expect(isValidSplitPieceCount('25')).toBe(false)
  })
})
