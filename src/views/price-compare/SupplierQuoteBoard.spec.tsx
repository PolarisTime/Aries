// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { SupplierPriceGrid } from '@/api/market/supplier-price-lists'

const priceApi = vi.hoisted(() => ({
  fetchSpecRows: vi.fn(),
  fetchSupplierPriceGrid: vi.fn(),
  addSupplierPriceColumn: vi.fn(),
  saveSupplierPriceColumnItems: vi.fn(),
  removeSupplierPriceColumn: vi.fn(),
}))

const supplierApi = vi.hoisted(() => ({ fetchSupplierOptions: vi.fn() }))
const materialBrands = vi.hoisted(() => ({ useMaterialBrands: vi.fn() }))
const permissions = vi.hoisted(() => ({ canWrite: true }))
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
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => permissions.canWrite,
}))

import { SupplierQuotePage } from './SupplierQuotePage'

const ROW_A = { category: '直条', material: 'HRB400E', spec: 12, length: '9米' }
const ROW_B = { category: '直条', material: 'HRB400E', spec: 14, length: '9米' }
const ROW_PANLUO = {
  category: '盘螺',
  material: 'HRB400',
  spec: 8,
  length: '-',
}

const SUPPLIER = {
  id: 's1',
  supplierCode: 'S001',
  supplierName: '浙江铁都钢材有限公司',
  brands: ['中天'],
  value: 's1',
  label: '浙江铁都钢材有限公司',
}

const COLUMN = {
  listId: 'l1',
  supplierId: 's1',
  supplierName: '浙江铁都钢材有限公司',
  quotedOn: '2026-10-29',
  updatedAt: null,
  warehouse: null,
  version: 3,
}

function gridWithColumn(): SupplierPriceGrid {
  return {
    brandName: '中天',
    columns: [COLUMN],
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

/** 自动保存的防抖时长是 800ms：等过去再断言。 */
const flushAutosave = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900))
  })
}

describe('供应商报价表（供应商为主轴的报价工作台）', () => {
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
    window.localStorage.clear()

    permissions.canWrite = true
    priceApi.fetchSpecRows.mockReset().mockResolvedValue([ROW_A, ROW_B])
    priceApi.fetchSupplierPriceGrid
      .mockReset()
      .mockResolvedValue(gridWithColumn())
    priceApi.addSupplierPriceColumn.mockReset().mockResolvedValue(COLUMN)
    priceApi.saveSupplierPriceColumnItems.mockReset().mockResolvedValue({
      ...COLUMN,
      version: 4,
    })
    priceApi.removeSupplierPriceColumn.mockReset().mockResolvedValue(undefined)
    supplierApi.fetchSupplierOptions.mockReset().mockResolvedValue([SUPPLIER])
    materialBrands.useMaterialBrands = vi.fn(() => ['中天', '永钢'])
    feedback.message.success.mockReset()
    feedback.message.error.mockReset()
    feedback.message.info.mockReset()
    feedback.message.warning.mockReset()
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

  /** 轮询等待某个断言条件成立（网格与价格是异步回来的，固定 flush 次数不稳）。 */
  async function waitFor(predicate: () => boolean, timeout = 2000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeout) {
      if (predicate()) return
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    }
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
    // 等供应商自动选中 → 网格返回 → 行渲染出来
    await waitFor(
      () =>
        container.querySelectorAll(
          '.ant-table-tbody tr:not(.ant-table-measure-row)',
        ).length > 0,
    )
  }

  const headers = () =>
    Array.from(container.querySelectorAll('.ant-table-thead th')).map(
      (node) => node.textContent ?? '',
    )
  const rows = () =>
    container.querySelectorAll(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    )
  const cellInput = (label: string) =>
    container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)

  async function typePrice(label: string, value: string) {
    const input = cellInput(label)
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

  it('只有一家供应商时直接进入表格：行 = 商品，列 = 该供应商的经营品牌', async () => {
    await render()

    // 表头：材质/规格/定尺/品牌 + 品牌列 + 本行最低价
    expect(headers().some((text) => text.includes('中天'))).toBe(true)
    expect(headers().some((text) => text.includes('材质'))).toBe(true)
    // 一个品牌只占一列（不再拆「品牌 → 材质 → 定尺」）
    expect(headers().filter((text) => text.includes('中天'))).toHaveLength(1)
    expect(rows()).toHaveLength(2)
    // 服务端价格直接回显
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')
    expect(cellInput('中天 HRB400E 14 9米')?.value).toBe('3300')
  })

  /**
   * 回归（2026-11-03 按真实数据复现）：品牌列只按「供应商经营品牌」取数时，
   * 库里已有价格表、但不在经营品牌里的品牌会整列消失 —— 历史价格还在库中，却没有任何入口
   * 能看到或维护它。实测某供应商经营品牌是「武钢汉钢/萍钢/铜陵富鑫」，而库里有「中天」「万泰」
   * 两张价格表。旧界面有一条测试锁这个行为，重做工作台时被裁掉，这里补回。
   */
  it('不在经营品牌里、但库里已有价格表的品牌仍然成列（历史价格不能被藏起来）', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天'] },
    ])
    // 万泰不在经营品牌里，但商品品牌全集里有它（构建候选品牌的发现来源）
    materialBrands.useMaterialBrands = vi.fn(() => ['中天', '万泰'])
    // 万泰的价格表列 id 是 l9，价格必须挂在 l9 上，才能验证「历史价格照常回显」
    const wanTaiColumn = { ...COLUMN, listId: 'l9' }
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '万泰'
          ? {
              brandName: '万泰',
              columns: [wanTaiColumn],
              rows: [
                {
                  ...ROW_A,
                  prices: { l9: 3280 },
                  priceStatuses: { l9: 'NORMAL' },
                  remarks: {},
                },
              ],
            }
          : gridWithColumn(),
      ),
    )

    await render()

    await waitFor(() => headers().some((text) => text.includes('万泰')))
    expect(headers().some((text) => text.includes('万泰'))).toBe(true)
    // 该品牌的历史价格照常回显，并且可继续编辑
    await waitFor(() => cellInput('万泰 HRB400E 12 9米')?.value === '3280')
    expect(cellInput('万泰 HRB400E 12 9米')?.value).toBe('3280')
  })

  /**
   * 回归（2026-11-03）：自动保存有 800ms 防抖，且保存失败时改动只留在内存里。原界面把未保存
   * 草稿写进 localStorage、回到页面提示「已恢复 / 放弃」；重做工作台时这段能力丢了，
   * 于是切页或刷新会静默丢掉刚敲的价格。这里锁两条：刷新后能恢复、能一键放弃。
   */
  it('刷新后恢复上次未保存的草稿，并可一键放弃', async () => {
    window.localStorage.setItem(
      'aries:supplier-quote-drafts:s1',
      JSON.stringify({ 中天: { '直条|HRB400E|12|9米': 3290 } }),
    )

    await render()

    // 恢复的草稿覆盖服务端值，并给出可放弃的提示
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3290')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3290')
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.draftsRestored'),
    )

    const discard = Array.from(container.querySelectorAll('button')).find(
      (node) =>
        node.textContent === i18n.t('priceCompare.supplierPrice.discardDrafts'),
    )
    expect(discard, '应有「放弃草稿」按钮').toBeDefined()
    await act(async () => {
      discard?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 放弃后回到服务端价格，提示消失，本地存储也清掉
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
    expect(container.textContent).not.toContain(
      i18n.t('priceCompare.supplierPrice.draftsRestored'),
    )
    expect(
      window.localStorage.getItem('aries:supplier-quote-drafts:s1'),
    ).toBeNull()
  })

  it('改动会写入本地草稿，保存成功后自动清除', async () => {
    await render()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    await typePrice('中天 HRB400E 12 9米', '3299')
    // 防抖期间还没落库，但本地必须已经有草稿（否则此刻刷新就丢了）
    expect(
      JSON.parse(
        window.localStorage.getItem('aries:supplier-quote-drafts:s1') ?? '{}',
      ),
    ).toEqual({ 中天: { '直条|HRB400E|12|9米': 3299 } })

    await flushAutosave()
    // 自动保存完成后草稿清空，本地存储随之删除
    await waitFor(
      () =>
        window.localStorage.getItem('aries:supplier-quote-drafts:s1') === null,
    )
    expect(
      window.localStorage.getItem('aries:supplier-quote-drafts:s1'),
    ).toBeNull()
  })

  /**
   * 盘螺不分定尺、直条分 9米/12米。混在一张表里时盘螺行在 9米/12米 上永远是空格，
   * 表头宽度还要按两类定尺的并集算。拆成两张表后，每张表只保留自己用得到的定尺列。
   */
  it('盘螺与直条分成两张表，且各自只保留用得到的定尺列', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_PANLUO,
      ROW_A,
      ROW_B,
      { ...ROW_B, spec: 14, length: '12米' },
    ])

    await render()

    const sections = Array.from(
      document.querySelectorAll('.supplier-price-sheet-category'),
    )
    expect(sections).toHaveLength(2)

    const headersOfSection = (index: number) =>
      Array.from(sections[index].querySelectorAll('.ant-table-thead th')).map(
        (node) => (node.textContent ?? '').trim(),
      )

    // 盘螺表：一个品牌一列（不分定尺，所以连「—」子表头都不该有），不出现 9米/12米
    expect(sections[0].textContent).toContain('盘螺')
    expect(headersOfSection(0).some((text) => text.includes('9米'))).toBe(false)
    expect(headersOfSection(0).some((text) => text.includes('12米'))).toBe(
      false,
    )
    expect(headersOfSection(0).some((text) => text.includes('中天'))).toBe(true)
    expect(headersOfSection(0)).not.toContain('—')
    // 盘螺照样能录价（定尺是 '-'）
    expect(cellInput('中天 HRB400 8 -')).not.toBeNull()

    // 直条表：9米 / 12米 都在
    expect(sections[1].textContent).toContain('直条')
    expect(headersOfSection(1).some((text) => text.includes('9米'))).toBe(true)
    expect(headersOfSection(1).some((text) => text.includes('12米'))).toBe(true)
  })

  it('不再渲染满屏「—」：没有价的格子就是可输入的空格', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([ROW_A, ROW_B, ROW_PANLUO])
    await render()

    // 盘螺行也有一格可输入（材质/定尺退回成行字段后，任何组合都能报价）
    expect(cellInput('中天 HRB400 8 -')).not.toBeNull()
  })

  it('单元格改动后自动保存：未改动的行一并提交（整列替换不能丢）', async () => {
    await render()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    await typePrice('中天 HRB400E 12 9米', '3290')
    await flushAutosave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...ROW_A, price: 3290, priceStatus: 'NORMAL' },
        { ...ROW_B, price: 3300 },
      ],
    )
  })

  it('行末给出本行最低价品牌', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([ROW_A])
    priceApi.fetchSupplierPriceGrid.mockResolvedValue({
      brandName: '中天',
      columns: [COLUMN],
      rows: [
        {
          ...ROW_A,
          prices: { l1: 3280 },
          priceStatuses: {},
          remarks: {},
        },
      ],
    })
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      {
        ...SUPPLIER,
        brands: ['中天', '永钢'],
      },
    ])
    // 永钢这一列是新列（无价格）
    priceApi.addSupplierPriceColumn.mockResolvedValue({
      ...COLUMN,
      listId: 'l2',
      supplierId: 's2',
      supplierName: '沙钢贸易',
    })
    await render()

    // 定尺变成列之后，最低价要带上定尺（否则多个定尺列的最低价分不清是哪一个）
    await waitFor(() => (container.textContent ?? '').includes('中天 9米 3280'))
    expect(container.textContent).toContain('中天 9米 3280')
  })

  it('搜索按材质/规格/定尺过滤行', async () => {
    await render()

    const search = container.querySelector<HTMLInputElement>(
      `input[aria-label="${i18n.t('priceCompare.supplierPrice.searchSpecs')}"]`,
    )
    expect(search).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(search, '14')
      search?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(rows()).toHaveLength(1)
  })

  it('清空某一格后保存：该条目从载荷里消失（服务端据此删除）', async () => {
    await render()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    await typePrice('中天 HRB400E 12 9米', '')
    await flushAutosave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [{ ...ROW_B, price: 3300 }],
    )
  })

  it('只读账号不可编辑', async () => {
    permissions.canWrite = false
    await render()

    expect(cellInput('中天 HRB400E 12 9米')?.disabled).toBe(true)
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.readOnlyHint'),
    )
  })

  it('供应商没有经营品牌时给出明确引导', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: [] },
    ])
    priceApi.fetchSupplierPriceGrid.mockResolvedValue({
      brandName: '',
      columns: [],
      rows: [],
    })
    await render()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.noBrands'),
    )
  })
})
