// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import * as cashLedgerApi from '@/api/finance/cash-ledger'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { FinanceCounterpartyLedgerModal } from './finance-overview-ledger-modal'

vi.mock('@/api/finance/cash-ledger', () => ({
  getCashLedger: vi.fn(),
}))

const balance: FinanceBalance = {
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

describe('FinanceCounterpartyLedgerModal 渲染冒烟', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
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

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderModal = (
    props: { balance?: FinanceBalance | null; open?: boolean } = {},
  ) => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(FinanceCounterpartyLedgerModal, {
            balance: props.balance ?? balance,
            formatAmount: (value) => (value == null ? '--' : String(value)),
            open: props.open ?? true,
            onClose: vi.fn(),
          }),
        ),
      )
    })
  }

  it('open 且有 balance 时请求流水并渲染标题', async () => {
    vi.mocked(cashLedgerApi.getCashLedger).mockResolvedValue({
      page: {
        content: [
          {
            key: 'f1',
            businessDate: '2026-01-01',
            flowType: '收款',
            documentNo: 'SK-1',
            incomeAmount: 40,
            expenseAmount: 0,
          },
        ],
        totalElements: 1,
      },
    } as unknown as Awaited<ReturnType<typeof cashLedgerApi.getCashLedger>>)
    renderModal()
    await flushAsync()
    expect(cashLedgerApi.getCashLedger).toHaveBeenCalled()
    expect(document.querySelector('.ant-modal-title')?.textContent).toContain(
      '客户A · 对账明细',
    )
    expect(document.body.textContent).toContain('SK-1')
  })

  it('关闭状态下不触发请求', () => {
    renderModal({ open: false, balance: null })
    expect(cashLedgerApi.getCashLedger).not.toHaveBeenCalled()
  })

  it('请求失败时展示错误与重试', async () => {
    vi.mocked(cashLedgerApi.getCashLedger).mockRejectedValue(
      new Error('网络失败'),
    )
    renderModal()
    await flushAsync()
    expect(document.body.textContent).toContain('加载对账明细失败')
  })
})
