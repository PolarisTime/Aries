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

import { SupplierPriceListBrandMatrixEditor } from './SupplierPriceListBrandMatrixEditor'

const BRAND = '安徽富鑫'
const SUPPLIER_A = '1000000000000000001'
const SUPPLIER_B = '1000000000000000002'
const LIST_A = '1900000000000000001'

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
  id: LIST_A,
  supplierId: SUPPLIER_A,
  supplierName: '杭州中金钢铁',
  brandName: BRAND,
  updatedAt: '2026-09-28T14:35:00',
  itemCount: 2,
}

/**
 * 品牌视图矩阵编辑器的界面契约（R2 + 轴向变更）:
 * 行是规格（只读固定列）、列是供应商；单元格留空 = 不报价（文字标记, 不靠颜色），
 * 失焦提交 `price: null`（绝不写 0）；单价列内 Tab 纵向连续录入；
 * 整表加减入口在该列的列头菜单里。
 */
describe('SupplierPriceListBrandMatrixEditor', () => {
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
      id: '1900000000000000009',
      supplierId: SUPPLIER_B,
      supplierName: '浙江铁都钢材',
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
          createElement(SupplierPriceListBrandMatrixEditor, {
            brandName: BRAND,
            supplierColumns: [
              { supplierId: SUPPLIER_B, supplierName: '浙江铁都钢材' },
            ],
            onChanged: () => {},
          }),
        ),
      )
    })
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 30)
      })
    })
  }

  const priceInputs = () => [
    ...container.querySelectorAll<HTMLInputElement>('input[data-supplier]'),
  ]

  const inputFor = (supplierId: string, rowIndex: number) =>
    container.querySelector<HTMLInputElement>(
      `input[data-supplier="${supplierId}"][data-price-row-index="${rowIndex}"]`,
    )

  it('左侧规格为只读列，右侧每个供应商一列，单价可访问名带供应商与行', async () => {
    await render()

    const cells = [...container.querySelectorAll('.ant-table-tbody td')].map(
      (node) => node.textContent ?? '',
    )
    expect(cells.some((text) => text.includes('螺纹钢'))).toBe(true)
    expect(cells.some((text) => text.includes('抗震钢E'))).toBe(true)
    expect(cells.some((text) => text.includes('Φ12'))).toBe(true)
    expect(cells.some((text) => text.includes('9米'))).toBe(true)

    // 列 = 该品牌已有价格表的供应商 + 追加供应商
    expect(priceInputs()).toHaveLength(4)
    const labels = priceInputs().map((input) =>
      input.getAttribute('aria-label'),
    )
    expect(labels).toContain('杭州中金钢铁 螺纹钢 抗震钢E Φ12 9米 单价')
    expect(labels).toContain('浙江铁都钢材 螺纹钢 抗震钢E Φ14 9米 单价')
  })

  it('价格表已有价被带出，不报价与未填写用文字标记(不靠颜色)', async () => {
    await render()
    expect(inputFor(SUPPLIER_A, 0)?.value).toBe('3220.00')
    const markers = [
      ...container.querySelectorAll('.supplier-price-cell-marker'),
    ]
      .map((node) => node.textContent ?? '')
      .filter(Boolean)
    expect(markers).toContain('不报价')
    expect(markers).toContain('未填写')
  })

  it('单价列内 Tab 纵向连续录入，Shift+Tab 反向', async () => {
    await render()
    const first = inputFor(SUPPLIER_A, 0)
    const second = inputFor(SUPPLIER_A, 1)
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
    const input = inputFor(SUPPLIER_A, 0)
    expect(input).toBeTruthy()
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
    expect(calledId).toBe(LIST_A)
    // 服务端已有 2 条条目必须原样带上（全量替换），且都不报价 = null 而不是 0
    expect(payload.items).toHaveLength(2)
    expect(payload.items.map((entry) => entry.price)).toEqual([null, null])
    expect(payload.items.every((entry) => entry.price !== 0)).toBe(true)
  })

  it('尚无价格表的供应商列首次填价时建表（POST），空白失焦不建表', async () => {
    await render()
    const blank = inputFor(SUPPLIER_B, 0)
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
    // 数据键不变：写入的是该（供应商, 品牌）表
    expect(payload.brandName).toBe(BRAND)
    expect(payload.supplierId).toBe(SUPPLIER_B)
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].price).toBe(3000)
  })

  it('列头（整表加减入口所在处）可聚焦且可被读屏念出供应商名', async () => {
    await render()
    const triggers = [
      ...container.querySelectorAll<HTMLElement>('.column-header-menu-trigger'),
    ]
    expect(triggers.length).toBeGreaterThanOrEqual(2)
    // role=button + tabIndex=0: Shift+F10/Enter/Space 可打开列头菜单(内含整表加减)
    for (const trigger of triggers) {
      expect(trigger.getAttribute('role')).toBe('button')
      expect(trigger.getAttribute('tabindex')).toBe('0')
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    }
    const names = triggers.map((node) => node.textContent ?? '')
    expect(names.some((name) => name.includes('杭州中金钢铁'))).toBe(true)
    expect(names.some((name) => name.includes('浙江铁都钢材'))).toBe(true)
  })
})
