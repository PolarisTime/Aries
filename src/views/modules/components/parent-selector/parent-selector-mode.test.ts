import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { buildSelectedSummary } from './parent-selector-mode'

const t = vi.fn(
  (key: string, options?: Record<string, unknown>) =>
    `${key}:${JSON.stringify(options ?? {})}`,
)

describe('buildSelectedSummary', () => {
  it('多选且含可导入数量时使用 selectedMultiSummary 分支', () => {
    const rows = [
      { id: '1', orderNo: 'PO-001', importableQuantity: 5, items: [{}, {}] },
      { id: '2', orderNo: 'PO-002', importableQuantity: 3, items: [{}] },
    ] as unknown as ModuleRecord[]
    const summary = buildSelectedSummary({
      allowMultipleSelection: true,
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      t,
    })
    expect(summary).toContain('selectedMultiSummary:')
    const options = t.mock.calls.at(-1)?.[1] as Record<string, number>
    expect(options.orderCount).toBe(2)
    expect(options.lineCount).toBe(3)
    expect(options.importableQuantity).toBe(8)
  })

  it('多选但无可导入数量字段时退回 selectedMultiSummarySimple 分支', () => {
    const rows = [{ id: '1', items: [] }] as unknown as ModuleRecord[]
    const summary = buildSelectedSummary({
      allowMultipleSelection: true,
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      t,
    })
    expect(summary).toContain('selectedMultiSummarySimple:')
  })

  it('多选时负数可导入数量不计入汇总', () => {
    const rows = [
      { id: '1', importableQuantity: -5 },
    ] as unknown as ModuleRecord[]
    buildSelectedSummary({
      allowMultipleSelection: true,
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      t,
    })
    const options = t.mock.calls.at(-1)?.[1] as Record<string, number>
    expect(options.importableQuantity).toBe(0)
  })

  it('单选有选中行时使用 selectedSingleSummary 分支并取展示字段单号', () => {
    const rows = [{ id: '99', orderNo: 'PO-009' }] as ModuleRecord[]
    const summary = buildSelectedSummary({
      allowMultipleSelection: false,
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      t,
    })
    expect(summary).toContain('selectedSingleSummary:')
    const options = t.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(options.count).toBe(1)
    expect(options.docNo).toBe('PO-009')
  })

  it('单选展示字段为空时回退到 id', () => {
    const rows = [{ id: 99 }] as unknown as ModuleRecord[]
    buildSelectedSummary({
      allowMultipleSelection: false,
      selectedRows: rows,
      displayFieldKey: 'orderNo',
      t,
    })
    const options = t.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(options.docNo).toBe('99')
  })

  it('单选无选中行时使用 selectedEmptyHint 分支', () => {
    const summary = buildSelectedSummary({
      allowMultipleSelection: false,
      selectedRows: [],
      displayFieldKey: 'orderNo',
      t,
    })
    expect(summary).toContain('selectedEmptyHint')
  })
})
