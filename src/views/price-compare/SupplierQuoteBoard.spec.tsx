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

/*
 * 商品资料行必须带 brand：报价表的列 = 品牌 × 材质 × 定尺，全部来自商品资料自己的品牌字段。
 */
const ROW_A = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
}
const ROW_B = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 14,
  length: '9米',
}
const ROW_A12 = {
  brand: '中天',
  category: '直条',
  material: 'HRB400E',
  spec: 12,
  length: '12米',
}
const ROW_WANTAI = {
  brand: '万泰',
  category: '盘螺',
  material: 'HRB400E',
  spec: 6,
  length: '-',
}
const ROW_PANLUO = {
  brand: '中天',
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

/** 保存载荷里不含 brand（品牌由价格表列本身确定），断言时从行夹具里剔除。 */
const withoutBrand = (row: Record<string, unknown>) => {
  const { brand: _brand, ...rest } = row
  return rest
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
    priceApi.fetchSpecRows
      .mockReset()
      .mockResolvedValue([ROW_A, ROW_A12, ROW_B])
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

    // 表头：规格 + 「品牌 → 材质 → 定尺」三级
    expect(headers().some((text) => text.includes('规格'))).toBe(true)
    // 品牌作为一级表头只出现一次，材质与定尺挂在它下面
    expect(headers().filter((text) => text.includes('中天'))).toHaveLength(1)
    expect(headers()).toContain('HRB400E')
    expect(headers()).toContain('9米')
    expect(rows()).toHaveLength(2)
    // 服务端价格直接回显
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')
    expect(cellInput('中天 HRB400E 14 9米')?.value).toBe('3300')
  })

  /**
   * 口径（2026-11-03 用户明确）：品牌列**只按供应商资料里配置的经营品牌**。
   *
   * <p>库里若残留不在经营品牌内的价格表（经营品牌被改小过、或测试遗留），那些品牌不展示；
   * 因为保存只针对展示出来的列，所以它们的数据原样留在库中，不会被这次「整列替换」清掉。</p>
   *
   * <p>本条替换了此前「历史价格不能被藏起来 → 有价格表就成列」的反向断言：那个做法会让
   * 供应商明明只配了 3 个品牌、报价表却冒出 5 个，与配置不符。</p>
   */
  it('品牌列严格按经营品牌：库里有价格表但未配置的品牌不展示', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天'] },
    ])
    materialBrands.useMaterialBrands = vi.fn(() => ['中天', '万泰'])
    priceApi.fetchSpecRows.mockResolvedValue([ROW_A, ROW_PANLUO, ROW_WANTAI])
    const wanTaiColumn = { ...COLUMN, listId: 'l9' }
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '万泰'
          ? {
              brandName: '万泰',
              columns: [wanTaiColumn],
              rows: [
                {
                  ...ROW_WANTAI,
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

    // 中天（经营品牌）成列
    await waitFor(() => cellInput('中天 HRB400E 12 9米') !== null)
    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    // 万泰虽然有价格表，但不在经营品牌里 → 不成列
    expect(headers().some((text) => text.includes('万泰'))).toBe(false)
    expect(cellInput('万泰 HRB400E 6 -')).toBeNull()
    // 也不会为了它去发保存请求（数据原样留在库中）
    expect(priceApi.saveSupplierPriceColumnItems).not.toHaveBeenCalled()
  })

  /**
   * 核心口径（2026-11-03 用户提问「规格是预设的吗、能不能从商品资料提取对应品牌规格、没有就不添加」）：
   * 列不是预设的，而是按**每个品牌在商品资料里真实经营**的「材质 × 定尺」生成 ——
   * 萍钢没有 HRB400E、没有 12米，就不该给它这些列；中天有就出现。
   */
  it('每个品牌的材质/定尺列只取商品资料里该品牌真实存在的组合', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      // 中天：HRB400E 的 9米 与 12米 都有
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '12米',
      },
      // 萍钢：只有 HRB400 的 9米
      {
        brand: '萍钢',
        category: '直条',
        material: 'HRB400',
        spec: 12,
        length: '9米',
      },
    ])
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '萍钢'] },
    ])

    await render()

    const table = document.querySelector('.supplier-price-sheet')
    const headerText = () =>
      Array.from(table?.querySelectorAll('.ant-table-thead tr') ?? []).map(
        (row) =>
          Array.from(row.querySelectorAll('th')).map((th) =>
            (th.textContent ?? '').trim(),
          ),
      )

    // 材质层：中天只有 HRB400E，萍钢只有 HRB400
    const all = headerText().flat()
    expect(all).toContain('HRB400E')
    expect(all).toContain('HRB400')

    // 中天那一组里有 9米 与 12米；萍钢那一组只有 9米（没有 12米 列）
    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    expect(cellInput('中天 HRB400E 12 12米')).not.toBeNull()
    expect(cellInput('萍钢 HRB400 12 9米')).not.toBeNull()
    // 萍钢没有 HRB400E，也没有 12米：这些格子**根本不存在**（不是留空）
    expect(cellInput('萍钢 HRB400E 12 9米')).toBeNull()
    expect(cellInput('萍钢 HRB400 12 12米')).toBeNull()
  })

  /**
   * 回归（2026-11-03 用户提问「以品牌来筛选怎么会进表」）：列按品牌筛、行却按整个类别的规格
   * 并集算，会让「只属于不成列品牌」的规格变成整行没有任何可填格子的死行。
   * 实测数据：商品资料里 `圆钢` 品牌有 HPB300 20/32（该品牌既不是经营品牌、也没有价格表）。
   */
  /**
   * 供应商标签是**常驻**的：全部供应商都在标签栏里（一个标签 = 一个供应商，标签名用公司全称），
   * 不需要「添加」也不需要「关闭」。供应商四十多家时，下拉会把整屏铺成一列公司名，所以不这么做。
   */
  it('供应商以常驻标签页展示：标签名是公司名称，没有添加/关闭入口', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      SUPPLIER,
      { ...SUPPLIER, id: 's2', value: 's2', label: '杭州中金钢铁有限公司' },
    ])

    await render()

    const tabs = Array.from(
      document.querySelectorAll('.supplier-price-page .ant-tabs-tab'),
    )
    expect(tabs.map((node) => node.textContent?.trim())).toEqual([
      '浙江铁都钢材有限公司',
      '杭州中金钢铁有限公司',
    ])
    // 常驻标签没有关闭按钮，也没有「添加供应商」入口
    expect(document.querySelector('.ant-tabs-tab-remove')).toBeNull()
    expect(container.querySelector('.ant-tabs-nav-add')).toBeNull()
  })

  it('不成列的品牌（如圆钢）不会把自己的规格变成空行', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      // 成列品牌：中天 HRB400E 12 9米
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
      // 不成列品牌：圆钢 HPB300 20/32（供应商没经营它，也没有价格表）
      {
        brand: '圆钢',
        category: '直条',
        material: 'HPB300',
        spec: 20,
        length: '9米',
      },
      {
        brand: '圆钢',
        category: '直条',
        material: 'HPB300',
        spec: 32,
        length: '9米',
      },
    ])

    await render()

    // 表里只有中天这一个品牌列
    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    // 圆钢不成列，它的材质不该出现在表头
    expect(headers().some((text) => text.includes('HPB300'))).toBe(false)
    // 它独有的规格 20 / 32 也不该变成空行
    expect(rows()).toHaveLength(1)
    expect(container.textContent).not.toContain('HPB300')
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
        { ...withoutBrand(ROW_A), price: 3290, priceStatus: 'NORMAL' },
        { ...withoutBrand(ROW_B), price: 3300 },
      ],
    )
  })

  it('最低价格子高亮（最低价列已移除，改用单元格高亮表达）', async () => {
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

    // 只有一个品牌有价：该格打上高亮类，行末不再单列「最低价」
    await waitFor(() =>
      Boolean(
        container.querySelector(
          '.supplier-price-cheapest input[aria-label="中天 HRB400E 12 9米"]',
        ),
      ),
    )
    const cheapest = container.querySelector(
      '.supplier-price-cheapest input[aria-label="中天 HRB400E 12 9米"]',
    )
    expect(cheapest).not.toBeNull()
    // 没有价的永钢不算最低价
    expect(
      container.querySelector(
        '.supplier-price-cheapest input[aria-label="永钢 HRB400E 12 9米"]',
      ),
    ).toBeNull()
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
      [{ ...withoutBrand(ROW_B), price: 3300 }],
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
