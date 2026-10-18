// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { EditorItemsSummary } from './EditorItemsSummary'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

/**
 * P2-2 回归：编辑器金额必须与列表「总金额」同口径（含附加费用）且同格式（千分位）。
 *
 * <p>用例数据刻意让货物额与含费用合计**不同值**（114868.08 vs 115868.08）：
 * 若断言只写 `114868.08`，两种口径在"附加费为 0"时同值，分叉测不出来。</p>
 */
const items = [
  { id: '1', amount: 100000, weightTon: 10, quantity: 2 },
  { id: '2', amount: 14868.08, weightTon: 5.5, quantity: 1 },
] as unknown as ModuleRecord[]

describe('EditorItemsSummary 金额口径与格式', () => {
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
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  const render = (expenseTotalAmount?: number) => {
    act(() => {
      root.render(
        createElement(EditorItemsSummary, {
          items,
          ...(expenseTotalAmount === undefined ? {} : { expenseTotalAmount }),
        }),
      )
    })
    return container.textContent || ''
  }

  it('货物金额带千分位，不再是 114868.08', () => {
    const text = render()
    expect(text).toContain('114,868.08')
    expect(text).not.toContain('114868.08')
  })

  it('有附加费用时给出「含附加费用合计」，与列表总金额同口径（115,868.08）', () => {
    const text = render(1000)
    expect(text).toContain('114,868.08')
    expect(text).toContain('1,000.00')
    expect(text).toContain('115,868.08')
  })

  it('label 用「货物金额」，避免「金额」同时指两种口径', () => {
    const text = render(1000)
    expect(text).toContain('modules.itemsSummary.goodsAmount')
    expect(text).toContain('modules.itemsSummary.totalAmountWithExpense')
  })

  it('无附加费用时只给货物金额，不出现含费用合计（避免同值重复两行）', () => {
    const text = render(0)
    expect(text).toContain('modules.itemsSummary.goodsAmount')
    expect(text).not.toContain('modules.itemsSummary.totalAmountWithExpense')
  })

  it('重量沿用统一的 formatWeight（千分位 + 3 位小数）', () => {
    const heavy = [
      { id: '1', amount: 1, weightTon: 1234.5, quantity: 1 },
    ] as unknown as ModuleRecord[]
    act(() => {
      root.render(createElement(EditorItemsSummary, { items: heavy }))
    })
    expect(container.textContent || '').toContain('1,234.500')
  })
})
