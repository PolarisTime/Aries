// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { buildBalanceColumns } from './finance-overview-columns'

const record: FinanceBalance = {
  key: 'k1',
  direction: 'RECEIVABLE',
  counterpartyType: '客户',
  counterpartyId: '1',
  counterpartyCode: 'C001',
  counterpartyName: '客户A',
  settlementCompanyId: '10',
  settlementCompanyName: '主体A',
  recognizedAmount: 100,
  settledAmount: 40,
  outstandingAmount: 60,
  advanceAmount: 0,
}

describe('buildBalanceColumns 渲染冒烟', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('应收方向列标题与操作文案', () => {
    const columns = buildBalanceColumns(
      'RECEIVABLE',
      (value) => (value == null ? '--' : String(value)),
      vi.fn(),
      vi.fn(),
    )
    expect(
      columns.map((column) => ('title' in column ? column.title : null)),
    ).toEqual([
      '往来类型',
      '往来方编码',
      '往来方',
      '应收 (元)',
      '已收 (元)',
      '未收 (元)',
      '预收 (元)',
      '结算主体',
      '操作',
    ])
    const actionsColumn = columns.find((column) => column.key === 'actions') as
      | { render?: (value: unknown, record: FinanceBalance) => unknown }
      | undefined
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          actionsColumn?.render?.(null, record) as never,
        ),
      )
    })
    expect(container.textContent).toContain('对账明细')
    expect(container.textContent).toContain('去收款')
  })

  it('应付方向显示去付款', () => {
    const columns = buildBalanceColumns(
      'PAYABLE',
      (value) => (value == null ? '--' : String(value)),
      vi.fn(),
      vi.fn(),
    )
    const actionsColumn = columns.find((column) => column.key === 'actions') as
      | { render?: (value: unknown, record: FinanceBalance) => unknown }
      | undefined
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          actionsColumn?.render?.(null, record) as never,
        ),
      )
    })
    expect(container.textContent).toContain('去付款')
  })

  it('未收列对正余额附加高亮 class', () => {
    const columns = buildBalanceColumns(
      'RECEIVABLE',
      (value) => (value == null ? '--' : String(value)),
      vi.fn(),
      vi.fn(),
    )
    const outstandingColumn = columns.find(
      (column) =>
        'dataIndex' in column && column.dataIndex === 'outstandingAmount',
    ) as { render?: (value: number) => unknown } | undefined
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          outstandingColumn?.render?.(60) as never,
          outstandingColumn?.render?.(0) as never,
        ),
      )
    })
    expect(
      container.querySelectorAll('.finance-overview-outstanding-value'),
    ).toHaveLength(1)
  })

  it('操作列回调透传 record 与 moduleKey', () => {
    const onLedger = vi.fn()
    const onQuickCreate = vi.fn()
    const columns = buildBalanceColumns(
      'RECEIVABLE',
      (value) => (value == null ? '--' : String(value)),
      onLedger,
      onQuickCreate,
    )
    const actionsColumn = columns.find((column) => column.key === 'actions') as
      | { render?: (value: unknown, record: FinanceBalance) => unknown }
      | undefined
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          actionsColumn?.render?.(null, record) as never,
        ),
      )
    })
    const buttons = Array.from(container.querySelectorAll('button'))
    act(() => {
      buttons[0]?.click()
      buttons[1]?.click()
    })
    expect(onLedger).toHaveBeenCalledWith(record)
    expect(onQuickCreate).toHaveBeenCalledWith(record, 'receipt')
  })
})
