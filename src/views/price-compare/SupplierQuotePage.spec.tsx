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

const baseRulesApi = vi.hoisted(() => ({
  fetchSupplierBasePriceRules: vi.fn(),
  saveSupplierBasePriceRules: vi.fn(),
}))

const materialBrands = vi.hoisted(() => ({
  useMaterialBrands: vi.fn(() => ['中天', '永钢']),
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
}))

vi.mock('@/api/market/supplier-price-lists', () => priceApi)
vi.mock('@/api/master/supplier-options', () => supplierApi)
vi.mock('@/api/market/supplier-base-price-rules', async (importOriginal) => {
  // 页面还要用真实导出的 basePriceRulesQueryKey，只替换两个请求函数
  const actual =
    await importOriginal<
      typeof import('@/api/market/supplier-base-price-rules')
    >()
  return {
    ...actual,
    fetchSupplierBasePriceRules: baseRulesApi.fetchSupplierBasePriceRules,
    saveSupplierBasePriceRules: baseRulesApi.saveSupplierBasePriceRules,
  }
})
vi.mock('@/hooks/useMaterialBrands', () => materialBrands)
vi.mock('@/utils/antd-app', () => feedback)
vi.mock('@/hooks/usePermission', () => ({
  useHasPermission: () => permissions.canWrite,
}))

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

describe('供应商报价表（Excel 式报价网格）', () => {
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

    // 列显示偏好存在 localStorage：用例之间必须隔离，否则上一条隐藏的列会影响下一条
    window.localStorage.clear()
    permissions.canWrite = true
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
    baseRulesApi.fetchSupplierBasePriceRules.mockReset().mockResolvedValue({
      supplierId: 's1',
      brandName: '中天',
      base: null,
      items: [],
      version: '0',
    })
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

  const sheet = () => container.querySelector('.ant-table')
  const sheetHeaders = () =>
    Array.from(container.querySelectorAll('.ant-table-thead th')).map(
      (node) => node.textContent ?? '',
    )
  const sheetRows = () =>
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

  /** 自动确认最近一次 modal.confirm（保存/粘贴确认都用它），返回是否发生过确认。 */
  const confirmLastModal = async () => {
    const calls = feedback.modal.confirm.mock.calls
    if (!calls.length) return false
    const args = calls.at(-1)?.[0] as
      | { onOk?: () => void | Promise<void> }
      | undefined
    feedback.modal.confirm.mockClear()
    await act(async () => {
      await args?.onOk?.()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    return true
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
    await confirmLastModal()
    await flush()
  }

  /** 模拟从 Excel 粘贴：把文本塞进 paste 事件的 clipboardData。 */
  async function pasteInto(label: string, text: string) {
    const input = cellInput(label)
    expect(input, `未找到价格输入框 ${label}`).not.toBeNull()
    await act(async () => {
      input?.focus()
      const event = new Event('paste', { bubbles: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => text },
      })
      input?.dispatchEvent(event)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await confirmLastModal()
  }

  async function pressKey(label: string, key: string) {
    const input = cellInput(label)
    expect(input, `未找到价格输入框 ${label}`).not.toBeNull()
    await act(async () => {
      input?.focus()
      input?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 切换到「规格横置」视图。 */
  async function switchToSpecs() {
    const tab = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((node) =>
      (node.textContent ?? '').includes(
        i18n.t('priceCompare.supplierPrice.viewModeSpecs'),
      ),
    )
    expect(tab, '未找到「规格横置」切换').toBeTruthy()
    await act(async () => {
      tab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('未选供应商时给出入口提示，不渲染报价网格', async () => {
    await render()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.pickSupplier'),
    )
    expect(sheet()).toBeNull()
  })

  it('选供应商后渲染一张 Excel 式表格：序号 + 规格 + 品牌列，并回显已有报价', async () => {
    await render()
    await selectSupplier()

    const headers = sheetHeaders()
    expect(headers.some((text) => text.includes('序号'))).toBe(true)
    // 材质已抽到表头：列组头就是材质名（HRB400），不再有「材质」这一列
    expect(headers.some((text) => text.includes('HRB400'))).toBe(true)
    expect(headers.some((text) => text.includes('规格'))).toBe(true)
    expect(headers.some((text) => text.includes('中天'))).toBe(true)
    // 经营品牌之外、且没有历史价格表的品牌不出现在列里
    expect(headers.some((text) => text.includes('永钢'))).toBe(false)
    expect(sheetRows().length).toBe(2)
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3280')
    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('3300')
  })

  it('可切换到「规格横置」：定尺进表头、行是规格、品牌与材质分块', async () => {
    await render()
    await selectSupplier()

    await switchToSpecs()

    // 品牌分块 + 材质作为列组表头横跨各定尺
    const brand = container.querySelector('.supplier-price-transposed-brand')
    expect(brand?.textContent).toContain('中天')
    expect(brand?.textContent).toContain('HRB400')

    // 两层表头：「材质 | 规格」+「HRB400 | 9米 12米」
    const headers = sheetHeaders()
    expect(headers).toContain(
      i18n.t('priceCompare.supplierPrice.materialColumn'),
    )
    expect(headers).toContain(i18n.t('priceCompare.supplierPrice.specColumn'))
    expect(headers).toContain('9米')

    // 规格是行（12 / 14，不带 Φ），价格回显在对应定尺列里
    expect(container.textContent).toContain('12')
    expect(container.textContent).toContain('14')
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3280')
    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('3300')
  })

  it('规格横置下录价并保存：仍按 类别|材质|规格|定尺 提交整组', async () => {
    await render()
    await selectSupplier()
    await switchToSpecs()

    await typePrice('中天 HRB400 12 9米', '3456')
    await clickSave()

    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...ROW_A, price: 3456, priceStatus: 'NORMAL' },
        { ...ROW_B, price: 3300 },
      ],
    )
  })

  it('同一规格的 9米/12米 拆成两列：一行两个价格，各占一列', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([ROW_A])
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '中天'
          ? {
              ...gridWithColumn(),
              rows: [
                {
                  ...ROW_A,
                  prices: { l1: 3210 },
                  priceStatuses: { l1: 'NORMAL' },
                  remarks: {},
                },
                {
                  ...ROW_A,
                  length: '12米',
                  prices: { l1: 3230 },
                  priceStatuses: {},
                  remarks: {},
                },
              ],
            }
          : emptyGrid(brandName),
      ),
    )
    await render()
    await selectSupplier()

    // 两个定尺合成一行，而不是两行
    expect(sheetRows().length).toBe(1)
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3210')
    expect(cellInput('中天 HRB400 12 12米')?.value).toBe('3230')
    // 定尺是**表头**（每个品牌下 9米/12米 各一列），不再是格子里的标签
    const headers = [...container.querySelectorAll('.ant-table-thead th')].map(
      (node) => node.textContent ?? '',
    )
    expect(headers.some((text) => text.includes('9米'))).toBe(true)
    expect(headers.some((text) => text.includes('12米'))).toBe(true)
    // 同一行里两个定尺各占一格，互不覆盖
    expect(
      container.querySelectorAll('[data-grid-cell*="螺纹钢|HRB400|12|"]')
        .length,
    ).toBe(2)
  })

  it('修改一格后保存：未改动的服务端价格一并带上（整组替换）', async () => {
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
  })

  it('清空一格后保存：该规格从条目里消失', async () => {
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

  it('从 Excel 粘贴整列：一次填入多行，再保存即落库', async () => {
    await render()
    await selectSupplier()

    await pasteInto('中天 HRB400 12 9米', '3290\n3310')
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3290')
    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('3310')

    await clickSave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...ROW_A, price: 3290, priceStatus: 'NORMAL' },
        { ...ROW_B, price: 3310 },
      ],
    )
  })

  it('回车/方向键在列内上下移动焦点（Excel 手感）', async () => {
    await render()
    await selectSupplier()

    await pressKey('中天 HRB400 12 9米', 'Enter')
    expect(
      (document.activeElement as HTMLInputElement | null)?.getAttribute(
        'aria-label',
      ),
    ).toBe('中天 HRB400 14 9米')

    await pressKey('中天 HRB400 14 9米', 'ArrowUp')
    expect(
      (document.activeElement as HTMLInputElement | null)?.getAttribute(
        'aria-label',
      ),
    ).toBe('中天 HRB400 12 9米')
  })

  it('经营品牌直接建列；录入后保存先建列再提交条目', async () => {
    // 品牌来源是供应商资料：资料里有两个经营品牌 → 表格直接两列，无需手动选择
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])
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

    expect(sheetHeaders().some((text) => text.includes('永钢'))).toBe(true)
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

    expect(sheetHeaders().some((text) => text.includes('中天'))).toBe(true)
  })

  it('供应商没有品牌列时给出明确引导，而不是渲染一张无处输价的空表', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: [] },
    ])
    // 也没有任何历史价格表 → 一个品牌列都不可见
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(emptyGrid(brandName)),
    )
    await render()
    await selectSupplier()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.noBrands'),
    )
    expect(sheet()).toBeNull()
  })

  it('规格列表加载失败时提示错误并可重试，而不是显示成「没有报价」', async () => {
    priceApi.fetchSpecRows.mockRejectedValue(new Error('422'))
    await render()
    await selectSupplier()

    const alert = container.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.specsLoadFailed'),
    )
    expect(alert?.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.retry'),
    )
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
  })

  const brandHeaders = () =>
    Array.from(
      container.querySelectorAll(
        '.ant-table-thead .supplier-price-brand-handle',
      ),
    ).map((el) => el.textContent)

  async function clickButton(text: string) {
    const button = Array.from(container.querySelectorAll('button')).find(
      (item) =>
        (item.textContent ?? '').includes(text) ||
        (item.getAttribute('aria-label') ?? '').includes(text),
    )
    expect(button, `未找到按钮 ${text}`).not.toBeNull()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await confirmLastModal()
    await flush()
  }

  async function toggleCheckbox(label: string) {
    const wrapper = Array.from(
      document.body.querySelectorAll('.ant-checkbox-wrapper'),
    ).find((el) => (el.textContent ?? '').includes(label))
    expect(wrapper, `未找到勾选项 ${label}`).not.toBeNull()
    await act(async () => {
      wrapper
        ?.querySelector('input')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('列显示：取消勾选即隐藏该列，全部隐藏时给出提示', async () => {
    await render()
    await selectSupplier()
    expect(brandHeaders()).toEqual(['中天'])

    await clickButton(i18n.t('priceCompare.supplierPrice.columns'))
    await toggleCheckbox('中天')

    expect(brandHeaders()).toEqual([])
    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.allColumnsHidden'),
    )
  })

  it('隐藏列不会丢掉该列未保存的改动（保存仍提交隐藏列）', async () => {
    await render()
    await selectSupplier()
    await typePrice('中天 HRB400 12 9米', '3290')

    await clickButton(i18n.t('priceCompare.supplierPrice.columns'))
    await toggleCheckbox('中天')
    expect(brandHeaders()).toEqual([])

    await clickSave()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledWith(
      'l1',
      3,
      [
        { ...ROW_A, price: 3290, priceStatus: 'NORMAL' },
        { ...ROW_B, price: 3300 },
      ],
    )
  })

  it('保存前先弹「新增/改价/取消」差异确认，确认后才发请求', async () => {
    await render()
    await selectSupplier()
    await typePrice('中天 HRB400 12 9米', '3290')

    const button = saveButton()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(feedback.modal.confirm).toHaveBeenCalledTimes(1)
    const args = feedback.modal.confirm.mock.calls[0][0] as {
      title?: unknown
      content?: unknown
    }
    expect(String(args.title)).toContain(
      i18n.t('priceCompare.supplierPrice.saveDiffTitle'),
    )
    expect(String(args.content)).toContain(
      i18n.t('priceCompare.supplierPrice.saveDiffContent', {
        brands: 1,
        added: 0,
        changed: 1,
        removed: 0,
      }),
    )
    expect(priceApi.saveSupplierPriceColumnItems).not.toHaveBeenCalled()

    await confirmLastModal()
    expect(priceApi.saveSupplierPriceColumnItems).toHaveBeenCalledTimes(1)
  })

  it('多格粘贴先确认覆盖格数，确认后才写入草稿', async () => {
    await render()
    await selectSupplier()
    const input = cellInput('中天 HRB400 12 9米')
    expect(input).not.toBeNull()

    await act(async () => {
      input?.focus()
      const event = new Event('paste', { bubbles: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: () => '3290\n3310' },
      })
      input?.dispatchEvent(event)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(feedback.modal.confirm).toHaveBeenCalledTimes(1)
    const args = feedback.modal.confirm.mock.calls[0][0] as {
      content?: unknown
    }
    expect(String(args.content)).toContain(
      i18n.t('priceCompare.supplierPrice.pasteConfirmContent', {
        count: 2,
        overwrite: 2,
      }),
    )
    // 未确认前不写入
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3280')

    await confirmLastModal()
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3290')
    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('3310')
  })

  it('撤销/重做（工具栏按钮与 Ctrl+Z / Ctrl+Y）', async () => {
    await render()
    await selectSupplier()
    await typePrice('中天 HRB400 12 9米', '3290')
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3290')

    await clickButton(i18n.t('priceCompare.supplierPrice.undo'))
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3280')

    await clickButton(i18n.t('priceCompare.supplierPrice.redo'))
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3290')
  })

  it('没有维护权限时只读：输入禁用、保存禁用并给出提示', async () => {
    permissions.canWrite = false
    await render()
    await selectSupplier()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.readOnlyHint'),
    )
    expect(cellInput('中天 HRB400 12 9米')?.disabled).toBe(true)
    expect(saveButton()?.disabled).toBe(true)
  })

  it('刷新后恢复本地未保存草稿，并可一键放弃', async () => {
    window.localStorage.setItem(
      'aries:supplier-quote-drafts:s1',
      JSON.stringify({ 中天: { '螺纹钢|HRB400|12|9米': 3290 } }),
    )
    await render()
    await selectSupplier()

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.draftsRestored'),
    )
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3290')

    await clickButton(i18n.t('priceCompare.supplierPrice.discardDrafts'))
    expect(cellInput('中天 HRB400 12 9米')?.value).toBe('3280')
    expect(container.textContent).not.toContain(
      i18n.t('priceCompare.supplierPrice.draftsRestored'),
    )
  })

  /** 切换价格录入方式（Segmented）。 */
  async function switchPriceMode(label: string) {
    const item = Array.from(
      container.querySelectorAll('.ant-segmented-item'),
    ).find((node) => (node.textContent ?? '').includes(label))
    expect(item, `未找到录入方式 ${label}`).not.toBeNull()
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  const baseRules = () => ({
    supplierId: 's1',
    brandName: '中天',
    base: { material: 'HRB400', spec: 12, length: '9米' },
    items: [
      { material: 'HRB400', spec: 12, length: '9米', delta: 0 },
      { material: 'HRB400', spec: 14, length: '9米', delta: 50 },
    ],
    version: '2',
  })

  const gridWithoutPrices = () =>
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '中天'
          ? {
              ...gridWithColumn(),
              rows: [
                { ...ROW_A, prices: {}, priceStatuses: {}, remarks: {} },
                { ...ROW_B, prices: {}, priceStatuses: {}, remarks: {} },
              ],
            }
          : emptyGrid(brandName),
      ),
    )

  it('基价模式：填基价后其余规格按「基价 + 加价」自动算好，且只有基价格可编辑', async () => {
    baseRulesApi.fetchSupplierBasePriceRules.mockResolvedValue(baseRules())
    gridWithoutPrices()
    await render()
    await selectSupplier()
    await switchPriceMode('基价模式')

    await typePrice('中天 HRB400 12 9米', '3200')
    await flush()

    // 14 的价 = 基价 3200 + 加价 50
    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('3250')
    // 算出来的格子只读，避免用户误以为能改
    expect(cellInput('中天 HRB400 14 9米')?.disabled).toBe(true)
    expect(cellInput('中天 HRB400 12 9米')?.disabled).toBe(false)
  })

  it('手填模式：填基价格子不会联动其它规格', async () => {
    baseRulesApi.fetchSupplierBasePriceRules.mockResolvedValue(baseRules())
    gridWithoutPrices()
    await render()
    await selectSupplier()

    await typePrice('中天 HRB400 12 9米', '3200')
    const baseInput = cellInput('中天 HRB400 12 9米')
    await act(async () => {
      baseInput?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(cellInput('中天 HRB400 14 9米')?.value).toBe('')
    expect(cellInput('中天 HRB400 14 9米')?.disabled).toBe(false)
  })

  it('基价模式下没配基价的品牌给出可见提示，且仍可手填', async () => {
    baseRulesApi.fetchSupplierBasePriceRules.mockRejectedValue(new Error('404'))
    gridWithoutPrices()
    await render()
    await selectSupplier()
    await switchPriceMode('基价模式')

    expect(container.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.baseNotConfigured'),
    )
    // 没有规则 → 不锁死，仍然可以手填
    expect(cellInput('中天 HRB400 14 9米')?.disabled).toBe(false)
  })

  it('基价规格在格子里带「基价」标记', async () => {
    baseRulesApi.fetchSupplierBasePriceRules.mockResolvedValue({
      supplierId: 's1',
      brandName: '中天',
      base: { material: 'HRB400', spec: 12, length: '9米' },
      items: [{ material: 'HRB400', spec: 12, length: '9米', delta: 0 }],
      version: '1',
    })
    await render()
    await selectSupplier()

    // 基价格：外层包一层带左色条的容器，同格里放一句隐藏文案给读屏
    const baseInput = container.querySelector(
      '[data-grid-cell*="螺纹钢|HRB400|12|9米"]',
    )
    const baseWrap = baseInput?.closest('.supplier-price-base-cell')
    expect(baseWrap).not.toBeNull()
    expect(baseWrap?.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.baseBadge'),
    )
  })

  it('表头不再重复显示报价日期；列设置收在右上角一个图标里', async () => {
    await render()
    await selectSupplier()

    // 报价日期只在单据头（顶部 DatePicker）出现，表头不再重复
    const thead = container.querySelector('.ant-table-thead')
    expect(thead).not.toBeNull()
    expect(thead?.textContent ?? '').not.toContain('报价日期')
    expect(thead?.textContent ?? '').not.toContain('2026-10-23')

    // 列操作不再挂在表头，而是右上角一个设置按钮
    // 同时守住「文案 key 真的存在」：缺 key 时 t() 会原样返回 key 字符串，界面会显示成
    // `priceCompare.supplierPrice.xxx`，而 tsc / 单测都发现不了（实测踩过一次）
    const columnMenuLabel = i18n.t('priceCompare.supplierPrice.columnMenu')
    expect(columnMenuLabel).not.toBe('priceCompare.supplierPrice.columnMenu')
    const settingsButton = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${columnMenuLabel}"]`,
    )
    expect(settingsButton).not.toBeNull()
    expect(settingsButton?.textContent).toContain(columnMenuLabel)
    expect(container.querySelector('[aria-label*="列操作"]')).toBeNull()
  })

  it('右上角「列设置」可打开基价加价配置弹层', async () => {
    await render()
    await selectSupplier()

    const menuButton = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${i18n.t('priceCompare.supplierPrice.columnMenu')}"]`,
    )
    expect(i18n.t('priceCompare.supplierPrice.columnMenu')).not.toBe(
      'priceCompare.supplierPrice.columnMenu',
    )
    await act(async () => {
      menuButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    const item = Array.from(
      document.body.querySelectorAll('.ant-dropdown-menu-item'),
    ).find((node) =>
      (node.textContent ?? '').includes(
        i18n.t('priceCompare.supplierPrice.basePriceRuleMenu'),
      ),
    )
    expect(item).toBeTruthy()
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(document.body.textContent).toContain(
      i18n.t('priceCompare.supplierPrice.basePriceRuleTitle'),
    )
  })

  it('拖拽列头调整顺序，并把偏好写入本地存储', async () => {
    supplierApi.fetchSupplierOptions.mockResolvedValue([
      { ...SUPPLIER, brands: ['中天', '永钢'] },
    ])
    await render()
    await selectSupplier()
    expect(brandHeaders()).toEqual(['中天', '永钢'])

    const handles = Array.from(
      container.querySelectorAll('.supplier-price-brand-handle'),
    )
    const from = handles.find((el) => el.textContent === '中天')
    const to = handles.find((el) => el.textContent === '永钢')
    expect(from && to).toBeTruthy()

    const store = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: '',
      setData: (key: string, value: string) => store.set(key, value),
      getData: (key: string) => store.get(key) ?? '',
    }
    await act(async () => {
      const start = new Event('dragstart', { bubbles: true })
      Object.defineProperty(start, 'dataTransfer', { value: dataTransfer })
      from?.dispatchEvent(start)
      const drop = new Event('drop', { bubbles: true })
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer })
      to?.dispatchEvent(drop)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    expect(brandHeaders()).toEqual(['永钢', '中天'])
    expect(
      window.localStorage.getItem('aries:supplier-quote-prefs:s1'),
    ).toContain('永钢')
  })

  it('规格搜索与「只看未填」都能过滤行', async () => {
    priceApi.fetchSupplierPriceGrid.mockImplementation((brandName: string) =>
      Promise.resolve(
        brandName === '中天'
          ? {
              ...gridWithColumn(),
              rows: [
                {
                  ...ROW_A,
                  prices: { l1: 3280 },
                  priceStatuses: { l1: 'NORMAL' },
                  remarks: {},
                },
                // ROW_B 未报价
                { ...ROW_B, prices: {}, priceStatuses: {}, remarks: {} },
              ],
            }
          : emptyGrid(brandName),
      ),
    )
    await render()
    await selectSupplier()
    expect(sheetRows().length).toBe(2)

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
    expect(sheetRows().length).toBe(1)

    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(search, '')
      search?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    await toggleCheckbox(i18n.t('priceCompare.supplierPrice.onlyUnpriced'))
    expect(sheetRows().length).toBe(1)
  })

  /** 盘螺（卷材）在商品资料里没有定尺，长度用 '-' 表示。 */
  const ROW_PANLUO: SupplierPriceSpecRow = {
    category: '盘螺',
    material: 'HRB400',
    spec: 8,
    length: '-',
  }

  it('没有「不分定尺」列：无定尺行（盘螺）的价格横跨定尺列', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_PANLUO,
      ROW_A,
      { ...ROW_A, length: '12米' },
    ])
    await render()
    await selectSupplier()

    // 表头只有真实定尺；无定尺的品类（盘螺）连第三层表头都不出现，也不叫「不分定尺」
    const headers = sheetHeaders()
    expect(headers.some((text) => text.includes('9米'))).toBe(true)
    expect(headers.some((text) => text.includes('12米'))).toBe(true)
    expect(headers.some((text) => text.trim() === '—')).toBe(false)
    expect(headers.some((text) => text.includes('不分定尺'))).toBe(false)

    // 盘螺行的价格格落在它自己的 '-' 定尺列上，且只占一个格（不再横跨定尺列）
    const cell = container.querySelector('[data-grid-cell*="盘螺|HRB400|8|-"]')
    expect(cell).not.toBeNull()
    expect(cell?.closest('td')?.getAttribute('colspan')).toBeNull()
    // 同一规格在「9米 / 12米」两列里显示「—」而不是可编辑空框
    expect(
      container.querySelectorAll('.supplier-price-cell-na').length,
    ).toBeGreaterThan(0)
  })

  it('规格列不带直径符号 Φ', async () => {
    await render()
    await selectSupplier()

    const specCells = [
      ...container.querySelectorAll('.ant-table-tbody td'),
    ].map((node) => node.textContent ?? '')
    expect(specCells.some((text) => text.includes('Φ'))).toBe(false)
    expect(specCells.some((text) => text.trim() === '12')).toBe(true)
  })

  it('价格输入框没有上下调整箭头', async () => {
    await render()
    await selectSupplier()

    expect(
      container.querySelectorAll('.ant-input-number-handler-wrap'),
    ).toHaveLength(0)
  })

  it('可在「列显示」里隐藏某个定尺列（只报 9米 的供应商）', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      { ...ROW_A, length: '12米' },
    ])
    await render()
    await selectSupplier()

    const columnsButton = Array.from(container.querySelectorAll('button')).find(
      (button) =>
        (button.textContent ?? '').includes(
          i18n.t('priceCompare.supplierPrice.columns'),
        ),
    )
    await act(async () => {
      columnsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    await toggleCheckbox('12米')
    expect(sheetHeaders().some((text) => text.includes('12米'))).toBe(false)
    expect(sheetHeaders().some((text) => text.includes('9米'))).toBe(true)

    await toggleCheckbox('12米')
    expect(sheetHeaders().some((text) => text.includes('12米'))).toBe(true)
  })

  it('可按「材质 × 定尺」隐藏整列（例如 HRB400 12米），不影响同材质的其它定尺', async () => {
    priceApi.fetchSpecRows.mockResolvedValue([
      ROW_A,
      { ...ROW_A, length: '12米' },
      ROW_B,
      { ...ROW_B, length: '12米' },
    ])
    await render()
    await selectSupplier()

    const openPanel = async () => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (item) =>
          (item.textContent ?? '').includes(
            i18n.t('priceCompare.supplierPrice.columns'),
          ),
      )
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      await flush()
    }

    await openPanel()
    // 面板里按「材质 定尺」列组合，数据里没有的组合不出现
    // 面板是 Popover（portal 到 body），断言要读 body
    expect(document.body.textContent).toContain('HRB400 9米')
    expect(document.body.textContent).toContain('HRB400 12米')

    await toggleCheckbox('HRB400 12米')
    // 12米 整列消失，9米 仍在（同一材质的其它定尺不受影响）
    expect(sheetHeaders().some((text) => text.includes('12米'))).toBe(false)
    expect(sheetHeaders().some((text) => text.includes('9米'))).toBe(true)
    // 价格格也只剩 9米 那两列
    expect(cellInput('中天 HRB400 12 9米')).not.toBeNull()
    expect(
      container.querySelector('[data-grid-cell*="螺纹钢|HRB400|12|12米"]'),
    ).toBeNull()
  })

  it('固定列也能在「列显示」里关掉，但至少保留一列', async () => {
    await render()
    await selectSupplier()
    const openPanel = async () => {
      const button = Array.from(container.querySelectorAll('button')).find(
        (item) =>
          (item.textContent ?? '').includes(
            i18n.t('priceCompare.supplierPrice.columns'),
          ),
      )
      await act(async () => {
        button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      await flush()
    }
    // 类别是表标题、材质进表头，固定列只剩 序号/规格
    const fixedLabels = ['rowIndex', 'specNo'].map((key) =>
      i18n.t(`priceCompare.supplierPrice.${key}`),
    )

    await openPanel()
    for (const label of fixedLabels) {
      expect(container.textContent).toContain(label)
    }

    await toggleCheckbox(fixedLabels[1])
    expect(sheetHeaders().some((text) => text.includes(fixedLabels[1]))).toBe(
      false,
    )
    expect(sheetHeaders().some((text) => text.includes(fixedLabels[0]))).toBe(
      true,
    )

    // 只剩一列时关不掉：否则每一行没有任何可读标识
    await toggleCheckbox(fixedLabels[0])
    expect(sheetHeaders().some((text) => text.includes(fixedLabels[0]))).toBe(
      true,
    )
  })
})
