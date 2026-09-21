// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { SheetPanel } from './SheetPanel'
import type { PriceRow, PriceSheet, Variety } from './types'

const variety: Variety = {
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  label: '螺纹钢 HRB400E 12 9米',
}

function makeSheet(): PriceSheet {
  return {
    id: 's1',
    name: '批次 1',
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '2026-09-10',
    refDate: '2026-09-10',
    refPeriod: '9:30 上午',
    lengthPremium: 30,
    inputs: {},
    rows: [],
  }
}

describe('SheetPanel 指定品牌展示', () => {
  let container: HTMLDivElement
  let root: Root

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

  function render(designatedBrands?: string[]) {
    act(() => {
      root.render(
        createElement(SheetPanel, {
          sheet: makeSheet(),
          data: null,
          varieties: [],
          brands: [{ name: '中天', freight: 30 }],
          rows: [],
          density: 'small',
          lengthPremium: 30,
          patchSheet: () => {},
          setRows: () => {},
          onReorderBrands: () => {},
          periods: [],
          onRefresh: () => {},
          chrome: false,
          spotRef: { current: null },
          designatedBrands,
        }),
      )
    })
  }

  it('在备注框后只读展示指定品牌', () => {
    render(['中天', '沙钢'])
    expect(container.textContent).toContain('指定品牌')
    expect(container.textContent).toContain('中天')
    expect(container.textContent).toContain('沙钢')
  })

  it('未配置指定品牌时仅展示占位符', () => {
    render([])
    expect(container.textContent).toContain('指定品牌')
    expect(container.textContent).toContain('-')
    expect(container.textContent).not.toContain('沙钢')
  })

  const baseRow: PriceRow = {
    id: 'r1',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
  }

  function renderStateful(
    initialSheet: PriceSheet,
    initialRows: PriceRow[],
    suppliers: { value: string; label: string; brands?: string[] }[] = [],
  ) {
    const observed = { rows: initialRows, sheet: initialSheet }
    function Harness() {
      const [sheet, setSheet] = useState(initialSheet)
      const [rows, setRows] = useState(initialRows)
      observed.rows = rows
      observed.sheet = sheet
      return createElement(SheetPanel, {
        sheet,
        data: null,
        varieties: [variety],
        brands: [{ name: '中天', freight: 30 }],
        rows,
        density: 'small',
        lengthPremium: 30,
        patchSheet: (_id, patch) => setSheet((prev) => ({ ...prev, ...patch })),
        setRows: (updater) => setRows((prev) => updater(prev)),
        onReorderBrands: () => {},
        periods: [],
        onRefresh: () => {},
        chrome: false,
        spotRef: { current: null },
        suppliers,
      })
    }
    act(() => {
      root.render(createElement(Harness))
    })
    return observed
  }

  it('规格数量锁定后禁用商品选择与吨位输入, 解锁后恢复', () => {
    renderStateful({ ...makeSheet(), specQuantityLocked: true }, [
      { ...baseRow },
    ])

    expect(container.querySelector('.ant-select-disabled')).not.toBeNull()
    expect(
      container.querySelector<HTMLInputElement>('input[data-ton="r1"]')
        ?.disabled,
    ).toBe(true)

    const unlock = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('解锁规格和数量'),
    )
    act(() => {
      unlock?.click()
    })

    expect(container.querySelector('.ant-select-disabled')).toBeNull()
    expect(
      container.querySelector<HTMLInputElement>('input[data-ton="r1"]')
        ?.disabled,
    ).toBe(false)
  })

  it('隔断行渲染为分隔带且不渲染商品/吨位/品牌输入', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow },
      {
        id: 'sep1',
        rowType: 'SEPARATOR',
        category: '',
        material: '',
        spec: null,
        length: '',
      },
    ])

    const separatorRow = container.querySelector('.price-compare-separator-row')
    expect(separatorRow).not.toBeNull()
    expect(separatorRow?.textContent).toContain('隔断')
    expect(separatorRow?.querySelector('input[data-ton]')).toBeNull()
    expect(separatorRow?.querySelector('input[data-spot]')).toBeNull()
    expect(separatorRow?.querySelector('.ant-select')).toBeNull()
  })

  it('点击"添加隔断"追加一行隔断行', () => {
    const observed = renderStateful({ ...makeSheet() }, [{ ...baseRow }])

    const addSeparator = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加隔断'),
    )
    expect(addSeparator).toBeTruthy()
    act(() => {
      addSeparator?.click()
    })

    expect(observed.rows).toHaveLength(2)
    expect(observed.rows[1].rowType).toBe('SEPARATOR')
  })

  it('规格数量锁定后禁用新增/删除/拖拽重排并给出提示', () => {
    renderStateful({ ...makeSheet(), specQuantityLocked: true }, [
      { ...baseRow },
    ])

    // 拖拽手柄不可拖拽并降级样式
    const drag = container.querySelector('.price-compare-row-drag')
    expect(drag?.getAttribute('draggable')).toBe('false')
    expect(drag?.classList.contains('price-compare-row-drag-disabled')).toBe(
      true,
    )

    // 新增行入口禁用
    const addRow = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加一行'),
    )
    expect(addRow?.disabled).toBe(true)

    // 选中一行后, 删除所选行入口禁用
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-tbody input[type="checkbox"]',
    )
    act(() => {
      rowCheckbox?.click()
    })
    const removeSelected = Array.from(
      container.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('删除'))
    expect(removeSelected?.disabled).toBe(true)
  })

  it('解锁规格数量后恢复新增与拖拽入口', () => {
    renderStateful(makeSheet(), [{ ...baseRow }])

    const drag = container.querySelector('.price-compare-row-drag')
    expect(drag?.getAttribute('draggable')).toBe('true')
    expect(drag?.classList.contains('price-compare-row-drag-disabled')).toBe(
      false,
    )

    const addRow = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加一行'),
    )
    expect(addRow?.disabled).toBe(false)
  })

  const suppliers = [
    { value: 's1', label: '沙钢' },
    { value: 's2', label: '河钢' },
  ]

  async function openSupplierDropdown() {
    const supplierSelect = container.querySelector('.price-compare-supplier')
    await act(async () => {
      supplierSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('品牌分组在差价后新增供应商简称列, 现货单元格不再内嵌供应商下拉', () => {
    renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3280, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [{ ...baseRow }],
      suppliers,
    )

    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[1]?.textContent ?? ''
    expect(headerRow).toContain('网价')
    expect(headerRow).toContain('现货')
    expect(headerRow).toContain('差价')
    expect(headerRow).toContain('简称')
    expect(headerRow.indexOf('差价')).toBeLessThan(headerRow.indexOf('简称'))

    const spotCell = container
      .querySelector('input[data-spot="中天:r1"]')
      ?.closest('td')
    expect(spotCell?.querySelector('.ant-select')).toBeNull()

    expect(
      container.querySelector('.price-compare-supplier')?.textContent,
    ).toContain('沙钢')
  })

  it('品牌列只显示绑定该品牌的供应商', async () => {
    renderStateful(
      makeSheet(),
      [{ ...baseRow }],
      [
        { value: 's1', label: '沙钢', brands: ['中天'] },
        { value: 's2', label: '河钢', brands: ['永钢'] },
      ],
    )

    await openSupplierDropdown()

    expect(
      document.body.querySelector('.ant-select-item-option[title="沙钢"]'),
    ).toBeTruthy()
    expect(
      document.body.querySelector('.ant-select-item-option[title="河钢"]'),
    ).toBeNull()
  })

  it('品牌无绑定供应商时回退显示全部', async () => {
    renderStateful(
      makeSheet(),
      [{ ...baseRow }],
      [
        { value: 's1', label: '沙钢', brands: ['永钢'] },
        { value: 's2', label: '河钢', brands: ['永钢'] },
      ],
    )

    await openSupplierDropdown()

    expect(
      document.body.querySelector('.ant-select-item-option[title="沙钢"]'),
    ).toBeTruthy()
    expect(
      document.body.querySelector('.ant-select-item-option[title="河钢"]'),
    ).toBeTruthy()
  })

  it('已选供应商不属于当前品牌时保留原值回显', () => {
    renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3280, supplierId: 's2', supplierName: '河钢' },
        },
      },
      [{ ...baseRow }],
      [
        { value: 's1', label: '沙钢', brands: ['中天'] },
        { value: 's2', label: '河钢', brands: ['永钢'] },
      ],
    )

    expect(
      container.querySelector('.price-compare-supplier')?.textContent,
    ).toContain('河钢')
  })

  it('在简称列选择供应商后回显简称并持久化到输入', async () => {
    const observed = renderStateful(makeSheet(), [{ ...baseRow }], suppliers)

    const supplierSelect = container.querySelector('.price-compare-supplier')
    expect(supplierSelect).not.toBeNull()
    await act(async () => {
      supplierSelect?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const option = document.body.querySelector(
      '.ant-select-item-option[title="河钢"]',
    )
    expect(option).toBeTruthy()
    await act(async () => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(observed.sheet.inputs['中天:r1']?.supplierId).toBe('s2')
    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
    expect(
      container.querySelector('.price-compare-supplier')?.textContent,
    ).toContain('河钢')
  })

  it('简称下拉支持拼音全拼与首字母索引', async () => {
    renderStateful(makeSheet(), [{ ...baseRow }], suppliers)

    await openSupplierDropdown()

    const searchInput =
      document.body.querySelector<HTMLInputElement>(
        '.price-compare-supplier .ant-select-input',
      ) ??
      document.body.querySelector<HTMLInputElement>(
        '.ant-select-dropdown .ant-select-input',
      )
    expect(searchInput).not.toBeNull()

    // 拼音首字母 "hg" 命中"河钢", 过滤掉"沙钢"
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(searchInput)
      setValue?.('hg')
      searchInput?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(
      document.body.querySelector('.ant-select-item-option[title="河钢"]'),
    ).toBeTruthy()
    expect(
      document.body.querySelector('.ant-select-item-option[title="沙钢"]'),
    ).toBeNull()
  })

  it('在类别列之前渲染行备注列, 且备注显示到输入框', () => {
    renderStateful(
      { ...makeSheet() },
      [{ ...baseRow, remark: '急单' }],
      suppliers,
    )

    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[0]?.textContent ?? ''
    expect(headerRow).toContain('备注')
    expect(headerRow.indexOf('备注')).toBeLessThan(headerRow.indexOf('类别'))

    const remarkInput = container.querySelector<HTMLInputElement>(
      'input.price-compare-row-remark',
    )
    expect(remarkInput).not.toBeNull()
    expect(remarkInput?.value).toBe('急单')
  })

  it('编辑行备注后持久化到行数据', () => {
    const observed = renderStateful({ ...makeSheet() }, [{ ...baseRow }])

    const remarkInput = container.querySelector<HTMLInputElement>(
      'input.price-compare-row-remark',
    )
    expect(remarkInput).not.toBeNull()
    act(() => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(remarkInput)
      setValue?.('甲方指定')
      remarkInput?.dispatchEvent(new Event('input', { bubbles: true }))
      remarkInput?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })

    expect(observed.rows[0].remark).toBe('甲方指定')
  })

  it('报单吨位列表头展示当前单据吨位合计', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow, id: 'r1', ton: 1.5 },
      { ...baseRow, id: 'r2', ton: 2.25 },
    ])

    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[0]?.textContent ?? ''
    expect(headerRow).toContain('报单吨位')
    const tonTotal = container.querySelector('.price-compare-ton-total')
    expect(tonTotal?.textContent).toContain('3.75')
  })

  it('隔断行不渲染备注输入', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow },
      {
        id: 'sep1',
        rowType: 'SEPARATOR',
        category: '',
        material: '',
        spec: null,
        length: '',
      },
    ])

    const separatorRow = container.querySelector('.price-compare-separator-row')
    expect(
      separatorRow?.querySelector('input.price-compare-row-remark'),
    ).toBeNull()
  })
})
