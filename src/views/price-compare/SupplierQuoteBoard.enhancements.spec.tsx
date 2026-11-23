// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { SupplierBasePriceRules } from '@/api/market/supplier-base-price-rules'
import type { SupplierPriceGrid } from '@/api/market/supplier-price-lists'
import type { SupplierBrandSpecItem } from '@/api/master/supplier-brand-specs'

const priceApi = vi.hoisted(() => ({
  fetchSpecRows: vi.fn(),
  fetchSupplierPriceGrid: vi.fn(),
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
  removeSupplierPriceColumn: vi.fn(),
}))

const supplierApi = vi.hoisted(() => ({ fetchSupplierOptions: vi.fn() }))
const brandSpecsApi = vi.hoisted(() => ({ fetchSupplierBrandSpecs: vi.fn() }))
const baseRulesApi = vi.hoisted(() => ({
  basePriceRulesQueryKey: (
    supplierId: string | undefined,
    brandName: string | undefined,
  ) =>
    ['supplier-base-price-rules', supplierId ?? '', brandName ?? ''] as const,
  fetchSupplierBasePriceRules: vi.fn(),
  saveSupplierBasePriceRules: vi.fn(),
}))
const permissions = vi.hoisted(() => ({ canWrite: true }))
const feedback = vi.hoisted(() => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
  notification: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    destroy: vi.fn(),
  },
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)
vi.mock('@/api/master/supplier-options', () => supplierApi)
vi.mock('@/api/master/supplier-brand-specs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/supplier-brand-specs')>()
  return {
    ...actual,
    fetchSupplierBrandSpecs: brandSpecsApi.fetchSupplierBrandSpecs,
  }
})
vi.mock('@/api/market/supplier-base-price-rules', () => baseRulesApi)
vi.mock('@/utils/antd-app', () => feedback)
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => permissions.canWrite,
}))

import { SupplierQuotePage } from './SupplierQuotePage'

const ROW_12 = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}
const ROW_14 = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 14,
  length: '9米',
}
const ROW_16 = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 16,
  length: '9米',
}

const SUPPLIER = {
  id: 's1',
  supplierCode: 'S001',
  supplierName: '浙江铁都钢材有限公司',
  brands: ['中天'],
  value: 's1',
  label: '浙江铁都钢材有限公司',
}

function makeGrid(overrides?: Partial<SupplierPriceGrid>): SupplierPriceGrid {
  return {
    brandName: '中天',
    columns: [
      {
        listId: 'l1',
        supplierId: 's1',
        supplierName: SUPPLIER.supplierName,
        quotedOn: '2026-10-20',
        updatedAt: '2026-10-20T09:00:00Z',
        warehouse: null,
        version: 1,
      },
      {
        listId: 'l-peer',
        supplierId: 's-peer',
        supplierName: '同行供应商',
        quotedOn: '2026-11-23',
        updatedAt: null,
        warehouse: null,
        version: 1,
      },
    ],
    rows: [
      {
        ...ROW_12,
        prices: { l1: 3200, 'l-peer': 3200 },
        priceStatuses: {},
        remarks: {},
      },
      {
        ...ROW_14,
        prices: { 'l-peer': 3250 },
        priceStatuses: {},
        remarks: {},
      },
      {
        ...ROW_16,
        prices: { l1: 3400, 'l-peer': 3300 },
        priceStatuses: {},
        remarks: {},
      },
    ],
    ...overrides,
  }
}

describe('SupplierQuoteBoard 批1与批3增强能力', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  const cellInput = (ariaLabel: string) =>
    container.querySelector<HTMLInputElement>(
      `input[aria-label="${ariaLabel}"]`,
    )

  const waitFor = async (predicate: () => boolean, timeoutMs = 2000) => {
    const start = Date.now()
    while (!predicate()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error('waitFor timed out')
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 15))
      })
    }
  }

  const typeAndCommit = (ariaLabel: string, value: string) => {
    const input = cellInput(ariaLabel)
    if (!input) throw new Error(`missing input: ${ariaLabel}`)
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(input)
      setValue?.(value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
  }

  const renderPage = () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SupplierQuotePage),
        ),
      )
    })
  }

  beforeEach(async () => {
    window.localStorage.clear()
    await i18n.changeLanguage('zh-CN')
    permissions.canWrite = true
    for (const fn of Object.values(feedback.message)) fn.mockReset()
    for (const fn of Object.values(feedback.notification)) fn.mockReset()
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
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    supplierApi.fetchSupplierOptions.mockResolvedValue([SUPPLIER])
    priceApi.fetchSpecRows.mockResolvedValue([ROW_12, ROW_14, ROW_16])
    priceApi.fetchSupplierPriceGrid.mockResolvedValue(makeGrid())
    priceApi.saveSupplierPriceColumnItems.mockResolvedValue({
      ...makeGrid().columns[0],
      version: 2,
    })
    brandSpecsApi.fetchSupplierBrandSpecs.mockResolvedValue([])
    baseRulesApi.fetchSupplierBasePriceRules.mockResolvedValue({
      supplierId: 's1',
      brandName: '中天',
      base: null,
      items: [],
      version: '0',
    } satisfies SupplierBasePriceRules)

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    container.remove()
  })

  it('品牌规格白名单生效：未在白名单内的规格不可填', async () => {
    const whitelist: SupplierBrandSpecItem[] = [
      {
        brandName: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
    ]
    brandSpecsApi.fetchSupplierBrandSpecs.mockResolvedValue(whitelist)

    renderPage()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3200')

    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    expect(cellInput('中天 HRB400E 14 9米')).toBeNull()
    expect(cellInput('中天 HRB400E 16 9米')).toBeNull()
  })

  it('录入基价规格后按基价加价规则自动填充空格，不覆盖已有价格', async () => {
    baseRulesApi.fetchSupplierBasePriceRules.mockResolvedValue({
      supplierId: 's1',
      brandName: '中天',
      base: { material: 'HRB400E', spec: 12, length: '9米' },
      items: [
        { material: 'HRB400E', spec: 12, length: '9米', delta: 0 },
        { material: 'HRB400E', spec: 14, length: '9米', delta: 50 },
        { material: 'HRB400E', spec: 16, length: '9米', delta: 80 },
      ],
      version: '1',
    } satisfies SupplierBasePriceRules)

    renderPage()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3200')
    await waitFor(
      () =>
        cellInput('中天 HRB400E 12 9米')?.className.includes(
          'supplier-price-base-cell',
        ) === true,
    )

    // 14 是空格，16 已有价格 3400
    expect(cellInput('中天 HRB400E 14 9米')?.value).toBe('')
    expect(cellInput('中天 HRB400E 16 9米')?.value).toBe('3400')

    typeAndCommit('中天 HRB400E 12 9米', '3300')

    // 14 被自动填成 3300 + 50 = 3350；16 保留已有手工价 3400
    expect(cellInput('中天 HRB400E 14 9米')?.value).toBe('3350')
    expect(cellInput('中天 HRB400E 16 9米')?.value).toBe('3400')
    expect(feedback.message.success).toHaveBeenCalledWith(
      i18n.t('priceCompare.supplierPrice.autoFilled', { count: 1 }),
    )
  })

  it('异常价高亮与提交预警，且非今日报价显示过期标记', async () => {
    renderPage()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3200')

    // 2026-10-20 早于今天 → 列头与顶部栏均显示过期标记
    expect(container.querySelector('[data-brand-stale="true"]')).not.toBeNull()
    expect(container.querySelector('.supplier-price-stale-tag')).not.toBeNull()

    // 录入高于同行最低价 3200 超过 10% 的异常价 4000
    typeAndCommit('中天 HRB400E 12 9米', '4000')

    expect(cellInput('中天 HRB400E 12 9米')?.className).toContain(
      'supplier-price-cell-outlier',
    )
    expect(feedback.message.warning).toHaveBeenCalledWith(
      expect.stringContaining('高于同行最低价'),
    )
  })

  it('收到 409 COLLAB_ACTIVE（4093）时提示并中止 REST 重试', async () => {
    priceApi.saveSupplierPriceColumnItems.mockRejectedValue(
      Object.assign(new Error('实时协作中'), { status: 409, code: 4093 }),
    )

    renderPage()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3200')

    typeAndCommit('中天 HRB400E 12 9米', '3260')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 950))
    })

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    expect(feedback.message.warning).toHaveBeenCalledWith(
      i18n.t('priceCompare.supplierPrice.collabActiveConflict'),
    )

    // 确认不再触发 2s 退避重试
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2100))
    })
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
  }, 10000)
})
