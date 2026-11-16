// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { SupplierPriceGrid } from '@/api/market/supplier-price-lists'
import { quoteRowKey } from './supplier-price-list-model'
import { readDrafts, writeDrafts } from './supplier-quote-view-prefs'

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
vi.mock('@/hooks/useMaterialBrands', () => materialBrands)
vi.mock('@/utils/antd-app', () => feedback)
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => permissions.canWrite,
}))

import { supplierBoardWidths } from './SupplierQuoteBoard'
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
    feedback.notification.success.mockReset()
    feedback.notification.error.mockReset()
    feedback.notification.info.mockReset()
    feedback.notification.warning.mockReset()
    feedback.notification.destroy.mockReset()

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

  it('直条固定 12 个规格：行来自品类模板，列 = 该供应商的经营品牌', async () => {
    await render()

    // 表头：规格 + 「品牌 → 材质 → 定尺」三级
    expect(headers().some((text) => text.includes('规格'))).toBe(true)
    // 品牌作为一级表头只出现一次，材质与定尺挂在它下面
    expect(headers().filter((text) => text.includes('中天'))).toHaveLength(1)
    // 材质收进表格左上角（第一行第一列），不再单独占一行标题
    expect(
      Array.from(
        document.querySelectorAll(
          '.ant-table-thead .supplier-price-corner-material',
        ),
      ).map((node) => node.textContent?.trim()),
    ).toContain('HRB400E')
    expect(headers()).toContain('9米')
    // 定尺列固定为品类模板：商品资料里只有 9米，12米列也保留（整列不可填）
    expect(headers()).toContain('12米')
    // 直条模板 12 个规格（10–40），不再等于商品资料里的 2 行
    expect(rows()).toHaveLength(12)
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
  it('材质平铺同屏，定尺列固定模板：缺该定尺的品牌整列保留但不可填', async () => {
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

    // 材质平铺：HRB400 / HRB400E 两张表**同时挂载**（demo：不再用 tab 切换）
    const materials = () =>
      Array.from(
        document.querySelectorAll(
          '.ant-table-thead .supplier-price-corner-material',
        ),
      ).map((node) => node.textContent?.trim())
    expect(materials()).toEqual(['HRB400', 'HRB400E'])
    expect(document.querySelector('.supplier-price-material-tabs')).toBeNull()
    // 两张表都在 DOM 里：中天的 HRB400E 两种定尺、萍钢的 HRB400 9米 都能直接编辑
    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    expect(cellInput('中天 HRB400E 12 12米')).not.toBeNull()
    expect(cellInput('萍钢 HRB400 12 9米')).not.toBeNull()

    // 萍钢只有 9米：12米列**保留但整列不可填**（没有输入框，只有斜纹占位）
    expect(cellInput('萍钢 HRB400 12 12米')).toBeNull()
    // 表头划线标记「这个定尺整列不能填」
    expect(
      document.querySelectorAll('.supplier-price-col-head-na').length,
    ).toBeGreaterThan(0)
  })

  /**
   * 版式一致（demo）：材质不切 tab 后，单材质品类就是「分区标题 + 一张表」，
   * 多材质品类是「分区标题 + 多张表并排」，不再出现 tab 行。
   */
  it('单材质品类平铺为一张表，不再有材质 tab 行', async () => {
    await render()

    const categoryBlock = (name: string) =>
      Array.from(
        document.querySelectorAll('.supplier-price-sheet-category'),
      ).find((block) =>
        block
          .querySelector('.supplier-price-sheet-category-name')
          ?.textContent?.includes(name),
      )

    // 直条只有 HRB400E 一种材质：平铺后直接是一张表，没有 tab 栏
    const zhitiao = categoryBlock('直条')
    expect(zhitiao?.querySelector('.supplier-price-material-tabs')).toBeNull()
    expect(
      zhitiao?.querySelectorAll('.supplier-price-sheet-material'),
    ).toHaveLength(1)
    // 表格照常挂在这唯一一个材质下
    expect(
      zhitiao?.querySelectorAll(
        '.ant-table-tbody tr:not(.ant-table-measure-row)',
      ).length,
    ).toBe(12)
  })

  /**
   * 盘螺不分定尺、直条分 9米/12米。混在一张表里时盘螺行在 9米/12米 上永远是空格，
   * 表头宽度还要按两类定尺的并集算。拆成两张表后，每张表只保留自己用得到的定尺列。
   */
  /** 标签页管理（antd：只有 `editable-card` 支持添加与关闭，溢出用内置 more 折叠）。 */
  it('供应商标签页可关闭，添加入口是可搜索的选择器', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      SUPPLIER,
      { ...SUPPLIER, id: 's2', value: 's2', label: '杭州中金钢铁有限公司' },
    ])

    await render()

    const tab = () =>
      document.querySelector('.supplier-price-supplier-tabs .ant-tabs-tab')
    expect(tab()?.textContent).toContain('浙江铁都钢材有限公司')
    expect(tab()?.querySelector('.ant-tabs-tab-remove')).not.toBeNull()
    // 添加是 Select（可搜索），不是把四十多家铺成菜单
    expect(
      document.querySelector('.supplier-price-supplier-tabs .ant-select'),
    ).not.toBeNull()
    expect(container.textContent).not.toContain('杭州中金钢铁有限公司')
  })

  /** 回归：只属于不成列品牌（如商品资料 brand='圆钢'）的规格不该变成空行。 */
  it('不成列的品牌（如圆钢）不会把自己的规格变成空行', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
      },
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

    expect(cellInput('中天 HRB400E 12 9米')).not.toBeNull()
    expect(container.textContent).not.toContain('HPB300')
    // 行来自固定模板（12 个规格），但不成列的品牌不会新增材质表或列
    expect(rows()).toHaveLength(12)
  })

  it('盘螺与直条分成两张表，且各自只保留用得到的定尺列', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_PANLUO,
      ROW_A,
      ROW_B,
      { ...ROW_B, spec: 14, length: '12米' },
    ])

    await render()

    // 两个类别左右并排（直条在左、盘螺在右），按标题取而不是按顺序取
    const sections = Array.from(
      document.querySelectorAll('.supplier-price-sheet-category'),
    )
    expect(sections).toHaveLength(2)
    const sectionOf = (name: string) =>
      sections.find((node) =>
        node
          .querySelector('.supplier-price-sheet-category-name')
          ?.textContent?.includes(name),
      ) as HTMLElement

    const headersOfSection = (node: HTMLElement) =>
      Array.from(node.querySelectorAll('.ant-table-thead th')).map((th) =>
        (th.textContent ?? '').trim(),
      )

    // 盘螺表：一个品牌一列（不分定尺，所以连「—」子表头都不该有），不出现 9米/12米
    const panluo = sectionOf('盘螺')
    expect(headersOfSection(panluo).some((text) => text.includes('9米'))).toBe(
      false,
    )
    expect(headersOfSection(panluo).some((text) => text.includes('12米'))).toBe(
      false,
    )
    expect(headersOfSection(panluo).some((text) => text.includes('中天'))).toBe(
      true,
    )
    expect(headersOfSection(panluo)).not.toContain('—')
    // 盘螺照样能录价（定尺是 '-'）
    expect(cellInput('中天 HRB400 8 -')).not.toBeNull()

    // 直条表：9米 / 12米 都在
    const zhiliao = sectionOf('直条')
    expect(headersOfSection(zhiliao).some((text) => text.includes('9米'))).toBe(
      true,
    )
    expect(
      headersOfSection(zhiliao).some((text) => text.includes('12米')),
    ).toBe(true)
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

  it('列头只显示品牌名：最后编辑时间挂在 title 上', async () => {
    // 中天有价格表；永钢是经营品牌且商品资料里有货，但还没建价格表
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      ROW_B,
      { ...ROW_A, brand: '永钢' },
    ])
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '永钢'
          ? { brandName: '永钢', columns: [], rows: [] }
          : gridWithColumn(),
      ),
    )
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])

    await render()

    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    // 状态点、⋯ 菜单、列宽把手都已移除，列头只剩品牌名
    expect(
      container.querySelector('.supplier-price-brand-head-flag'),
    ).toBeNull()
    expect(container.querySelector('.supplier-price-col-resize')).toBeNull()

    const saved = container.querySelector('[data-brand-status="saved"]')
    const notQuoted = container.querySelector(
      '[data-brand-status="not-quoted"]',
    )
    expect(
      saved
        ?.querySelector('.supplier-price-brand-head-title')
        ?.getAttribute('title'),
    ).toContain('10-29')
    expect(
      notQuoted
        ?.querySelector('.supplier-price-brand-head-title')
        ?.getAttribute('title'),
    ).toBeTruthy()
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

  it('输入价格有即时反馈：未保存显示琥珀条，保存成功后提示「已保存」', async () => {
    await render()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    await typePrice('中天 HRB400E 12 9米', '3380')

    // 草稿与服务端值不同 → 这一格有未保存改动（左琥珀条）
    expect(cellInput('中天 HRB400E 12 9米')?.className).toContain(
      'supplier-price-cell-dirty',
    )

    await flushAutosave()

    // 保存成功后草稿清掉：琥珀条消失，并出现「已保存」提示 + 该格绿色闪一下
    await waitFor(() =>
      Boolean(
        !cellInput('中天 HRB400E 12 9米')?.className.includes(
          'supplier-price-cell-dirty',
        ),
      ),
    )
    expect(cellInput('中天 HRB400E 12 9米')?.className).toContain(
      'supplier-price-cell-saved',
    )
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.saved'),
    )
  })

  it('只读账号不可编辑，只读提示走 message 而不是页内文字', async () => {
    permissions.canWrite = false
    await render()

    expect(cellInput('中天 HRB400E 12 9米')?.disabled).toBe(true)
    expect(feedback.message.warning).toHaveBeenCalledWith(
      i18n.t('priceCompare.supplierPrice.readOnlyHint'),
    )
    expect(container.textContent).not.toContain(
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

  /*
   * 列宽随个人设置字号缩放。
   *
   * 原实现把 64px（4 位数字）/ 96px（单定尺品牌列）/ 88·72·56（行首三列）写死，
   * 字号调到 16/18 后数字变宽、列宽不动 → 第 4 位被裁。这里锁定"字号是列宽的唯一依据"：
   * 14px 等于原设计值，其它字号等比缩放且单调。
   */
  it('列宽随字号等比缩放：14px 取设计值，字号变大列宽变大', () => {
    const base = supplierBoardWidths(14)
    expect(base.brand).toBe(64)
    expect(base.brandFlat).toBe(96)
    expect(base.rowHead.spec).toBe(72)
    expect(base.rowHead.material).toBe(88)
    expect(base.rowHead.category).toBe(56)

    const wide = supplierBoardWidths(18)
    expect(wide.brand).toBeGreaterThan(base.brand)
    expect(wide.brandFlat).toBeGreaterThan(base.brandFlat)
    expect(wide.rowHead.spec).toBeGreaterThan(base.rowHead.spec)
    expect(wide.rowHead.material).toBeGreaterThan(base.rowHead.material)
    expect(wide.rowHead.category).toBeGreaterThan(base.rowHead.category)

    // 单调不减：11 / 12 / 13 / 14 / 16 / 18 逐档递增
    const series = [11, 12, 13, 14, 16, 18].map(
      (fontSize) => supplierBoardWidths(fontSize).brand,
    )
    expect(series).toEqual([...series].sort((a, b) => a - b))
    expect(new Set(series).size).toBe(series.length)
  })

  /*
   * 用户反馈（2026-11-16）：草稿恢复后不会自动保存。恢复出来的改动只活在内存里，
   * 页面又没有保存按钮（提示文案却让用户去点「保存」），刷新/关标签就全丢。
   */
  it('恢复出来的草稿会自动保存，不用用户去找不存在的保存按钮', async () => {
    writeDrafts('s1', { 中天: { [quoteRowKey(ROW_A)]: 3290 } })

    await render()
    await flushAutosave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalled()
    const [, , items] = priceApi.saveSupplierPriceColumnItems.mock.calls.at(
      -1,
    ) as [string, number, Array<Record<string, unknown>>]
    expect(items).toContainEqual({
      ...withoutBrand(ROW_A),
      price: 3290,
      priceStatus: 'NORMAL',
    })
  })

  /*
   * 用户反馈（2026-11-16）：「放弃并切换」之后草稿没有真正删掉 —— 只清了内存，
   * localStorage 还留着，切回该供应商时又提示「已恢复草稿」。
   */
  it('「放弃草稿并切换」同时清掉本地存储', async () => {
    writeDrafts('s1', { 中天: { [quoteRowKey(ROW_A)]: 3290 } })
    await render()
    await waitFor(() => Boolean(document.querySelector('.ant-tabs-tab-remove')))

    // 关闭当前供应商页签 = 放弃草稿并切走（confirm 是 mock，手动执行 onOk）
    await act(async () => {
      document
        .querySelector<HTMLElement>('.ant-tabs-tab-remove')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const confirmArgs = feedback.modal.confirm.mock.calls[0]?.[0] as
      | { onOk?: () => void }
      | undefined
    expect(confirmArgs?.onOk).toBeTypeOf('function')
    await act(async () => {
      confirmArgs?.onOk?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(readDrafts('s1')).toEqual({})
  })

  /*
   * 键盘把焦点移到另一格时，选区必须跟着走。
   *
   * 用户实测（2026-11-16）：点「亚新 HRB400 8」（3320）→ 按 ↑ 移到上面的空格「6」→ 按 Delete，
   * 被清空的是 8 那一格。根因是 `onFocusCell` 只同步了粘贴锚点、没同步 `selection`，
   * 而 Delete / Ctrl+D / 右键菜单 / 批量调价读的都是 `selection`。
   */
  it('键盘移到空格再按 Delete：清的是当前格，不动上一个点过的格', async () => {
    priceApi.fetchSupplierPriceGrid.mockResolvedValue({
      brandName: '中天',
      columns: [COLUMN],
      rows: [
        {
          ...ROW_A,
          prices: { l1: 3280 },
          priceStatuses: { l1: 'NORMAL' },
          remarks: {},
        },
        // 下面这格故意留空：Delete 落到空格上应提示「没有可清空的格子」
        { ...ROW_B, prices: {}, priceStatuses: {}, remarks: {} },
      ],
    })
    await render()
    await waitFor(() => cellInput('中天 HRB400E 12 9米')?.value === '3280')

    // 1) 点有价的那格（建立选区）
    const priced = cellInput('中天 HRB400E 12 9米') as HTMLInputElement
    await act(async () => {
      priced.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      priced.focus()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 2) 方向键 ↓ 把焦点移到下面的空格
    await act(async () => {
      priced.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const focused = document.activeElement as HTMLInputElement | null
    expect(focused?.ariaLabel).toBe('中天 HRB400E 14 9米')

    // 3) Delete 落在空格上：不该去动上一次点过的 3280
    await act(async () => {
      focused?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(feedback.message.info).toHaveBeenCalledWith(
      i18n.t('priceCompare.supplierPrice.clearNothing'),
    )
    expect(priceApi.saveSupplierPriceColumnItems).not.toHaveBeenCalled()
    expect(cellInput('中天 HRB400E 12 9米')?.value).toBe('3280')
  })
})
