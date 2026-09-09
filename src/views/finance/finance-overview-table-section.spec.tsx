// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { FinanceOverviewTableSection } from './finance-overview-table-section'

const rows: FinanceBalance[] = [
  {
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
  },
]

const columns = [
  { title: '往来方', dataIndex: 'counterpartyName', width: 220 },
  { title: '应收 (元)', dataIndex: 'recognizedAmount', width: 150 },
] as Parameters<typeof FinanceOverviewTableSection>[0]['columns']

const baseProps = {
  columns,
  components: {},
  loading: false,
  onPageChange: vi.fn(),
  page: 1,
  pageSize: 20,
  queryEnabled: true,
  rows,
  scrollX: 400,
  total: 21,
}

describe('FinanceOverviewTableSection 渲染冒烟', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const renderSection = (
    props: Partial<Parameters<typeof FinanceOverviewTableSection>[0]> = {},
  ) => {
    act(() => {
      root.render(
        createElement(FinanceOverviewTableSection, { ...baseProps, ...props }),
      )
    })
  }

  it('渲染数据行与分页总数', () => {
    renderSection()
    expect(container.textContent).toContain('客户A')
    expect(container.textContent).toContain('100')
    expect(container.textContent).toContain('共 21 条')
    expect(container.querySelector('.finance-overview-table')).toBeTruthy()
  })

  it('分页变更回调透传页码', () => {
    renderSection()
    const pageTwo = Array.from(
      container.querySelectorAll('.ant-pagination-item'),
    ).find((item) => item.textContent === '2')
    act(() => {
      pageTwo?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(baseProps.onPageChange).toHaveBeenCalledWith(2, 20)
  })

  it('空数据时根据 queryEnabled 展示不同空态文案', () => {
    renderSection({ rows: [], total: 0 })
    expect(container.textContent).toContain('暂无往来余额')
    renderSection({ rows: [], total: 0, queryEnabled: false })
    expect(container.textContent).toContain('请选择结算主体')
  })
})
