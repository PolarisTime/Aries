// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type {
  SupplierPriceGrid,
  SupplierPriceSpecRow,
} from '@/api/market/supplier-price-lists'

const priceApi = vi.hoisted(() => ({
  fetchSpecRows: vi.fn(),
  fetchSupplierPriceGrid: vi.fn(),
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
  removeSupplierPriceColumn: vi.fn(),
}))

const supplierApi = vi.hoisted(() => ({
  fetchSupplierOptions: vi.fn(),
}))

const materialBrands = vi.hoisted(() => ({
  useMaterialBrands: vi.fn(() => ['中天', '永钢']),
}))

const feedback = vi.hoisted(() => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)
vi.mock('@/api/master/supplier-options', () => supplierApi)
vi.mock('@/hooks/useMaterialBrands', () => materialBrands)
vi.mock('@/utils/antd-app', () => feedback)

import { SupplierQuotePage } from './SupplierQuotePage'

const ROW_A: SupplierPriceSpecRow = {
  category: '螺纹钢',
  material: 'HRB400',
  spec: 12,
  length: '9米',
}
const ROW_B: SupplierPriceSpecRow = {
  category: '螺纹钢',
  material: 'HRB400',
  spec: 14,
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

const SUPPLIER_2 = {
  ...SUPPLIER,
  id: 's2',
  value: 's2',
  supplierName: '沙钢贸易',
  label: '沙钢贸易',
  brands: [],
}

function gridWithColumn(): SupplierPriceGrid {
  return {
    brandName: '中天',
    columns: [
      {
        listId: 'l1',
        supplierId: 's1',
        supplierName: '浙江铁都钢材有限公司',
        quotedOn: '2026-10-23',
        updatedAt: null,
        warehouse: null,
        version: 3,
      },
    ],
    rows: [
      {
        ...ROW_A,
        prices: { l1: 3280 },
        priceStatuses: { l1: 'NORMAL' },
        remarks: {},
      },
      {
        ...ROW_B,
        prices: { l1: 3300 },
        priceStatuses: {},
        remarks: {},
      },
    ],
  }
}

function emptyGrid(brandName: string): SupplierPriceGrid {
  return { brandName, columns: [], rows: [] }
}

describe('供应商报价表（供应商为主、品牌在下方）', () => {
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

    priceApi.fetchSpecRows.mockReset().mockResolvedValue([ROW_A, ROW_B])
    priceApi.fetchSupplierPriceGrid
      .mockReset()
      .mockImplementation((brandName: string) =>
        Promise.resolve(
          brandName === '中天' ? gridWithColumn() : emptyGrid(brandName),
        ),
      )
    priceApi.addSupplierPriceColumn.mockReset()
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({
      listId: 'l1',
      supplierId: 's1',
      supplierName: '浙江铁都钢材有限公司',
      quotedOn: '2026-10-23',
      updatedAt: null,
      warehouse: null,
      version: 4,
    })
    priceApi.removeSupplierPriceColumn.mockReset()
    supplierApi.fetchSupplierOptions.mockReset().mockResolvedValue([SUPPLIER])
    feedback.message.success.mockReset()
    feedback.message.error.mockReset()
    feedback.message.info.mockReset()
    feedback.modal.confirm.mockReset()

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
    document.body.innerHTML = ''
  })

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  async function render() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SupplierQuotePage) as ReactNode,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  /** 打开 antd Select 并点选一个选项（弹层渲染在 body 上）。 */
  async function pickOption(select: Element | null, title: string) {
    await act(async () => {
      select?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    let option: Element | null = null
    for (let i = 0; i < 20 && !option; i += 1) {
      option = document.querySelector(
        `.ant-select-item-option[title="${title}"]`,
      )
      if (!option) await new Promise((resolve) => setTimeout(resolve, 10))
    }
    expect(option, `未找到下拉选项 ${title}`).not.toBeNull()
    await act(async () => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const selects = () => container.querySelectorAll('.ant-select')

  async function selectSupplier(title = SUPPLIER.supplierName) {
    await pickOption(selects()[0] ?? null, title)
  }

  /** 品牌列表是页面里的第一张表，规格价格表是第二张。 */
  const brandTable = () => container.querySelectorAll('.ant-table')[0] ?? null
  const detailTable = () => container.querySelectorAll('.ant-table')[1] ?? null

  const brandTableText = () => brandTable()?.textContent ?? ''

  const detailRows = () =>
    detailTable()?.querySelectorAll(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    ) ?? []

  /** 在规格表里输入单价（antd InputNumber 以 input 事件驱动 onChange）。 */
  async function typePrice(label: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(
      `input[aria-label="${label}"]`,
    )
    expect(input, `未找到价格输入框 ${label}`).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, value)
      input?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const saveButton = () =>
    container.querySelector<HTMLButtonElement>('button.ant-btn-primary')

  async function clickSave() {
    const button = saveButton()
    expect(button, '未找到保存按钮').not.toBeNull()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('未选供应商时给出入口提示，不渲染品牌列表', async () => {
    await render()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.pickSupplier'),
    )
    expect(container.querySelector('.ant-table')).toBeNull()
  })

  it('选供应商后：上方是品牌列表，下方默认选中第一个品牌并回显其规格价格', async () => {
    await render()
    await selectSupplier()

    expect(brandTableText()).toContain('中天')
    // 经营品牌之外、且没有历史价格表的品牌不出现在品牌列表
    expect(brandTableText()).not.toContain('永钢')
    expect(detailRows().length).toBe(2)
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="中天 HRB400 12 9米"]',
      )?.value,
    ).toBe('3280.00')
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="中天 HRB400 14 9米"]',
      )?.value,
    ).toBe('3300.00')
  })

  it('修改一格后保存：只提交当前品牌，未改动的服务端价格一并带上', async () => {
    await render()
    await selectSupplier()

    await typePrice('中天 HRB400 12 9米', '3290')
    await clickSave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...ROW_A, price: 3290, priceStatus: 'NORMAL' },
        { ...ROW_B, price: 3300 },
      ],
    )
    expect(feedback.message.success).toHaveBeenCalledWith(
      i18n.t('priceCompare.supplierPrice.savedOne', { name: '中天' }),
    )
  })

  it('清空一格后保存：该规格从条目里消失（整组替换即删除）', async () => {
    await render()
    await selectSupplier()

    await typePrice('中天 HRB400 12 9米', '')
    await clickSave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [{ ...ROW_B, price: 3300 }],
    )
  })

  it('在品牌列表下方添加品牌后自动选中，保存时先建列、再提交条目', async () => {
    priceApi.addSupplierPriceColumn.mockResolvedValue({
      listId: 'l2',
      supplierId: 's1',
      supplierName: SUPPLIER.supplierName,
      quotedOn: null,
      updatedAt: null,
      warehouse: null,
      version: 0,
    })
    await render()
    await selectSupplier()

    // 第二个 Select 是「添加品牌」
    await pickOption(selects()[1] ?? null, '永钢')
    const addButton = Array.from(container.querySelectorAll('button')).find(
      (button) => (button.textContent ?? '').includes('添加品牌'),
    )
    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(brandTableText()).toContain('永钢')
    await typePrice('永钢 HRB400 12 9米', '3150')
    await clickSave()

    expect(priceApi.addSupplierPriceColumn).toHaveBeenCalledWith({
      brandName: '永钢',
      supplierId: 's1',
      quotedOn: expect.any(String),
    })
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l2',
      0,
      [{ ...ROW_A, price: 3150 }],
    )
  })

  it('经营品牌没维护、但已有历史价格表的品牌仍然出现（历史数据不能被藏起来）', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: [] },
    ])
    await render()
    await selectSupplier()

    expect(brandTableText()).toContain('中天')
  })

  it('有未保存改动时切换供应商先确认，确认后才切走（不静默丢草稿）', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([SUPPLIER, SUPPLIER_2])
    await render()
    await selectSupplier()
    await typePrice('中天 HRB400 12 9米', '3290')

    await pickOption(selects()[0] ?? null, '沙钢贸易')

    expect(feedback.modal.confirm).toHaveBeenCalledTimes(1)
    const confirmArgs = feedback.modal.confirm.mock.calls[0][0] as {
      onOk?: () => void
      title?: string
    }
    expect(confirmArgs.title).toBe(
      i18n.t('priceCompare.supplierPrice.discardTitle'),
    )

    await act(async () => {
      confirmArgs.onOk?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    // 切到没有经营品牌、也没有历史价格表的供应商：品牌列表为空并给出引导
    expect(brandTableText()).toContain(
      i18n.t('priceCompare.supplierPrice.noBrands'),
    )
  })
})
