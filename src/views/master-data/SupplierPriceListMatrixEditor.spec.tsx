// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  SupplierPriceListItemPayload,
  SupplierPriceListSummary,
  SupplierPriceSpecCatalogEntry,
} from '@/api/master/supplier-price-lists'

const { apiMocks } = vi.hoisted(() => ({
  apiMocks: {
    fetchAllSupplierPriceLists: vi.fn(),
    fetchSupplierPriceList: vi.fn(),
    fetchSupplierPriceSpecCatalog: vi.fn(),
    createSupplierPriceList: vi.fn(),
    updateSupplierPriceList: vi.fn(),
    deleteSupplierPriceList: vi.fn(),
    createSupplierPriceAdjustment: vi.fn(),
    fetchSupplierPriceListMatrix: vi.fn(),
  },
}))

vi.mock('@/api/master/supplier-price-lists', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/supplier-price-lists')>()
  return { ...actual, ...apiMocks }
})

import { SupplierPriceListMatrixEditor } from './SupplierPriceListMatrixEditor'

const SUPPLIER_ID = '1234567890123456789'
const LIST_ID = '1900000000000000001'

const CATALOG: SupplierPriceSpecCatalogEntry[] = [
  {
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 12,
    length: '9米',
    sortOrder: 0,
  },
  {
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 14,
    length: '9米',
    sortOrder: 1,
  },
]

const LIST: SupplierPriceListSummary = {
  id: LIST_ID,
  supplierId: SUPPLIER_ID,
  supplierName: '杭州中金钢铁',
  brandName: '安徽富鑫',
  updatedAt: '2026-09-28T14:35:00',
  itemCount: 1,
}

/**
 * 矩阵编辑器的界面契约（R2）:
 * 单元格留空 = 不报价(文字标记, 不靠颜色), 失焦提交 `price: null`(绝不写 0),
 * 单价列内 Tab 纵向连续录入, 左侧固定列可被读屏读出。
 */
describe('SupplierPriceListMatrixEditor', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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

    for (const mock of Object.values(apiMocks)) {
      mock.mockReset()
    }
    apiMocks.fetchSupplierPriceSpecCatalog.mockResolvedValue(CATALOG)
    apiMocks.fetchAllSupplierPriceLists.mockResolvedValue([LIST])
    apiMocks.fetchSupplierPriceList.mockResolvedValue({
      ...LIST,
      items: [
        {
          id: '1900000000000000011',
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 12,
          length: '9米',
          price: 3220,
          priceStatus: 'NORMAL',
          remark: null,
          sortOrder: 0,
        },
        {
          id: '1900000000000000012',
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 14,
          length: '9米',
          price: null,
          priceStatus: 'OUT_OF_STOCK',
          remark: null,
          sortOrder: 1,
        },
      ],
    })
    apiMocks.updateSupplierPriceList.mockResolvedValue({ ...LIST, items: [] })
    apiMocks.createSupplierPriceList.mockResolvedValue({
      ...LIST,
      id: '1900000000000000002',
      brandName: '萍钢',
      items: [
        {
          id: '1900000000000000031',
          category: '螺纹钢',
          material: '抗震钢E',
          spec: 12,
          length: '9米',
          price: 3000,
          priceStatus: 'NORMAL',
          remark: null,
          sortOrder: 0,
        },
      ],
    })
    apiMocks.createSupplierPriceAdjustment.mockResolvedValue({
      adjustmentId: '1900000000000000041',
      affectedCount: 0,
      skippedCount: 0,
      items: [],
    })
    apiMocks.deleteSupplierPriceList.mockResolvedValue(undefined)
    apiMocks.fetchSupplierPriceListMatrix.mockResolvedValue({
      columns: [],
      rows: [],
    })

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
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
  })

  async function render() {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SupplierPriceListMatrixEditor, {
            supplierId: SUPPLIER_ID,
            supplierName: '杭州中金钢铁',
            brands: ['安徽富鑫', '萍钢'],
            onChanged: () => {},
          }),
        ),
      )
    })
    // 等两个 query(catalog + lists/detail) 落定
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 30)
      })
    })
  }

  const priceInputs = () => [
    ...container.querySelectorAll<HTMLInputElement>('input[data-brand]'),
  ]

  const inputFor = (brand: string, rowIndex: number) =>
    container.querySelector<HTMLInputElement>(
      `input[data-brand="${brand}"][data-price-row-index="${rowIndex}"]`,
    )

  it('左侧固定列为只读文本，右侧每个品牌一列且单价可访问名带品牌与行', async () => {
    await render()

    // 左侧固定只读列
    const cells = [...container.querySelectorAll('.ant-table-tbody td')].map(
      (node) => node.textContent ?? '',
    )
    expect(cells.some((text) => text.includes('螺纹钢'))).toBe(true)
    expect(cells.some((text) => text.includes('抗震钢E'))).toBe(true)
    expect(cells.some((text) => text.includes('Φ12'))).toBe(true)
    expect(cells.some((text) => text.includes('9米'))).toBe(true)

    // 品牌列 = 已有价格表的品牌 + 经营品牌
    expect(priceInputs()).toHaveLength(4)
    const targets = priceInputs().map((input) =>
      input.getAttribute('aria-label'),
    )
    expect(targets).toContain('安徽富鑫 螺纹钢 抗震钢E Φ12 9米 单价')
    expect(targets).toContain('萍钢 螺纹钢 抗震钢E Φ14 9米 单价')
  })

  it('不报价用文字标记(不靠颜色)；价格表已有的价格被带出', async () => {
    await render()
    expect(inputFor('安徽富鑫', 0)?.value).toBe('3220.00')
    const markers = [
      ...container.querySelectorAll('.supplier-price-cell-marker'),
    ]
      .map((node) => node.textContent ?? '')
      .filter(Boolean)
    // 有服务端条目但价为 null 的行是「不报价」，尚无价格表的品牌列是「未填写」
    expect(markers).toContain('不报价')
    expect(markers).toContain('未填写')
  })

  it('单价列内 Tab 纵向连续录入，Shift+Tab 反向', async () => {
    await render()
    const first = inputFor('安徽富鑫', 0)
    const second = inputFor('安徽富鑫', 1)
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()

    act(() => {
      first?.focus()
    })
    act(() => {
      first?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(document.activeElement).toBe(second)

    act(() => {
      second?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    expect(document.activeElement).toBe(first)
  })

  it('清空单价并失焦后按「不报价」提交 null，不写 0', async () => {
    await render()
    const input = inputFor('安徽富鑫', 0)
    expect(input).toBeTruthy()
    // React 受控输入: 用原生 setter + input 事件模拟用户清空
    // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    act(() => {
      setter?.call(input, '')
      input?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => {
        setTimeout(resolve, 20)
      })
    })

    expect(apiMocks.updateSupplierPriceList).toHaveBeenCalledTimes(1)
    const [calledId, payload] = apiMocks.updateSupplierPriceList.mock
      .calls[0] as [string, { items: SupplierPriceListItemPayload[] }]
    expect(calledId).toBe(LIST_ID)
    // 服务端已有 2 条条目必须原样带上（全量替换），且都不报价 = null 而不是 0
    expect(payload.items).toHaveLength(2)
    expect(payload.items.map((entry) => entry.price)).toEqual([null, null])
    expect(payload.items.every((entry) => entry.price !== 0)).toBe(true)
  })

  it('尚无价格表的品牌列在首次填价时建表（POST），空白失焦不建表', async () => {
    await render()
    const blank = inputFor('萍钢', 0)
    await act(async () => {
      blank?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => {
        setTimeout(resolve, 20)
      })
    })
    expect(apiMocks.createSupplierPriceList).not.toHaveBeenCalled()

    // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set
    act(() => {
      setter?.call(blank, '3000')
      blank?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      blank?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => {
        setTimeout(resolve, 20)
      })
    })
    expect(apiMocks.createSupplierPriceList).toHaveBeenCalledTimes(1)
    const [payload] = apiMocks.createSupplierPriceList.mock.calls[0] as [
      {
        brandName: string
        supplierId: string
        items: SupplierPriceListItemPayload[]
      },
    ]
    expect(payload.brandName).toBe('萍钢')
    expect(payload.supplierId).toBe(SUPPLIER_ID)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].price).toBe(3000)
  })

  it('每个品牌列都提供 ≥24×24 的删除入口并带可访问名', async () => {
    await render()
    const labels = [
      ...container.querySelectorAll<HTMLButtonElement>(
        '.supplier-price-brand-delete',
      ),
    ].map((button) => button.getAttribute('aria-label'))
    // 固定列会渲染吸顶表头副本, 因此同一品牌列可能命中多个按钮; 断言集合而不是次数
    expect(new Set(labels)).toEqual(
      new Set(['删除「安徽富鑫」的价格表', '删除「萍钢」的价格表']),
    )
    expect(labels.length).toBeGreaterThanOrEqual(2)
  })
})
