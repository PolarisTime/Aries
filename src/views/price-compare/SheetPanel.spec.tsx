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
    brands: { name: string; freight: number }[] = [
      { name: '中天', freight: 30 },
    ],
    readOnly = false,
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
        brands,
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
        readOnly,
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
    // 锁定后控件不可编辑, 但需保留正常外观(不置灰): 依赖该标记类覆盖 disabled 样式
    expect(
      container.querySelectorAll(
        '.price-compare-locked-field.ant-select-disabled',
      ).length,
    ).toBeGreaterThan(0)
    expect(
      container.querySelector<HTMLInputElement>('input[data-ton="r1"]')
        ?.disabled,
    ).toBe(true)
    expect(
      container.querySelector(
        'input[data-ton="r1"].price-compare-locked-field',
      ),
    ).not.toBeNull()

    const unlock = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('解锁规格和数量'),
    )
    act(() => {
      unlock?.click()
    })

    expect(container.querySelector('.ant-select-disabled')).toBeNull()
    expect(container.querySelector('.price-compare-locked-field')).toBeNull()
    expect(
      container.querySelector<HTMLInputElement>('input[data-ton="r1"]')
        ?.disabled,
    ).toBe(false)
  })

  it('参照日期/时段锁定后不可编辑但保留正常外观标记', () => {
    renderStateful({ ...makeSheet(), locked: true }, [{ ...baseRow }])

    const lockedPickers = container.querySelectorAll(
      '.price-compare-locked-field.ant-picker-disabled',
    )
    expect(lockedPickers.length).toBeGreaterThan(0)
    expect(
      container.querySelector(
        '.price-compare-locked-field.ant-select-disabled',
      ),
    ).not.toBeNull()
  })

  it('只读态不套用锁定外观标记(仍保持置灰表现)', () => {
    renderStateful(
      { ...makeSheet(), locked: true, specQuantityLocked: true },
      [{ ...baseRow }],
      [],
      [{ name: '中天', freight: 30 }],
      true,
    )

    expect(container.querySelector('.price-compare-locked-field')).toBeNull()
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

  it('吨位输入按 Tab 可穿过中间隔断行聚焦到下一商品行', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow, id: 'r1' },
      {
        id: 'sep1',
        rowType: 'SEPARATOR',
        category: '',
        material: '',
        spec: null,
        length: '',
      },
      { ...baseRow, id: 'r2' },
    ])

    const first = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    expect(first).not.toBeNull()
    act(() => {
      first?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          bubbles: true,
          cancelable: true,
        }),
      )
    })

    expect(document.activeElement).toBe(
      container.querySelector<HTMLInputElement>('input[data-ton="r2"]'),
    )
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

  /** 模拟在会话内修改某单元格现货价(触发 onBlur), 使其成为「价格变动过的行」。 */
  async function editSpot(brandName: string, rowId: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(
      `input[data-spot="${brandName}:${rowId}"]`,
    )
    expect(input).not.toBeNull()
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.bind(input)
      setValue?.(value)
      input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 等待下拉选项按 title 出现(轮询, 兼容异步渲染)。 */
  async function waitForOption(title: string) {
    for (let i = 0; i < 20; i += 1) {
      const el = document.body.querySelector(
        `.ant-select-item-option[title="${title}"]`,
      )
      if (el) return el
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    return null
  }

  /** 打开指定下拉(容器内选择器)并点击 title 选项。 */
  async function pickOption(
    scope: ParentNode,
    selectSelector: string,
    title: string,
  ) {
    const select = scope.querySelector(selectSelector)
    await act(async () => {
      select?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option = await waitForOption(title)
    expect(option).toBeTruthy()
    await act(async () => {
      option?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

  it('品牌列头一键填入供应商到该列本次改过价的行', async () => {
    const observed = renderStateful(
      makeSheet(),
      [
        { ...baseRow, id: 'r1' },
        { ...baseRow, id: 'r2', spec: 16 },
      ],
      suppliers,
    )

    // 仅 r1 本次改过现货价; r2 未改价
    await editSpot('中天', 'r1', '3280')

    const fillBtn = container.querySelector('.price-compare-supplier-fill-btn')
    expect(fillBtn).not.toBeNull()
    await act(async () => {
      fillBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 在弹出层的供应商下拉中选择"河钢"
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '河钢',
    )

    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
    // 未改价的行不填
    expect(observed.sheet.inputs['中天:r2']?.supplierName).toBeUndefined()
  })

  it('批量填入覆盖改过价行的已有供应商值(换家重新报价)', async () => {
    const observed = renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3180, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [
        { ...baseRow, id: 'r1' },
        { ...baseRow, id: 'r2', spec: 16 },
      ],
      suppliers,
    )

    // 会话内改价 r1(旧价 3180 → 3200), 触发标记
    await editSpot('中天', 'r1', '3200')

    const fillBtn = container.querySelector('.price-compare-supplier-fill-btn')
    await act(async () => {
      fillBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await pickOption(
      document.body,
      '.price-compare-supplier-fill .price-compare-supplier-fill-select',
      '河钢',
    )

    expect(observed.sheet.inputs['中天:r1']?.supplierId).toBe('s2')
    // 现货价不被批量填入改动
    expect(observed.sheet.inputs['中天:r1']?.spot).toBe(3200)
    // 未改价的行不填
    expect(observed.sheet.inputs['中天:r2']?.supplierName).toBeUndefined()
  })

  it('未改价的行保留已有供应商(换第 N 家不误伤)', async () => {
    const observed = renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3180, supplierId: 's1', supplierName: '沙钢' },
          '中天:r2': { spot: 3300, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [
        { ...baseRow, id: 'r1' },
        { ...baseRow, id: 'r2', spec: 16 },
      ],
      suppliers,
    )

    // 仅 r1 改价; r2 保留沙钢
    await editSpot('中天', 'r1', '3200')

    await act(async () => {
      container
        .querySelector('.price-compare-supplier-fill-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '河钢',
    )

    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
    // r2 未改价, 保留原供应商
    expect(observed.sheet.inputs['中天:r2']?.supplierName).toBe('沙钢')
  })

  it('所选范围无改价行时批量填入不产生修改', async () => {
    const observed = renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3180, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [{ ...baseRow, id: 'r1' }],
      suppliers,
    )

    // 未做任何现货价修改, 直接批量填入
    await act(async () => {
      container
        .querySelector('.price-compare-supplier-fill-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '河钢',
    )

    // 原值不变
    expect(observed.sheet.inputs['中天:r1']?.supplierId).toBe('s1')
    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('沙钢')
  })

  it('填入成功后消费改价标记, 再次批量填入不重复生效', async () => {
    const observed = renderStateful(
      makeSheet(),
      [{ ...baseRow, id: 'r1' }],
      suppliers,
    )

    await editSpot('中天', 'r1', '3280')

    // 第一次填入: 命中改价行
    await act(async () => {
      container
        .querySelector('.price-compare-supplier-fill-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '河钢',
    )
    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')

    // 标记已被消费, 第二次填入不再改动(即使换成另一家)
    await act(async () => {
      container
        .querySelector('.price-compare-supplier-fill-btn')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '沙钢',
    )
    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
  })

  it('选中行后出现批量填入按钮, 仅填入选中的改价行', async () => {
    const observed = renderStateful(
      makeSheet(),
      [
        { ...baseRow, id: 'r1' },
        { ...baseRow, id: 'r2' },
      ],
      suppliers,
    )

    // 两个行都改价, 但只勾选 r1
    await editSpot('中天', 'r1', '3280')
    await editSpot('中天', 'r2', '3300')

    // 勾选第一行(跳过 antd 隐藏的 measure row)
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-row input[type="checkbox"]',
    )
    await act(async () => {
      rowCheckbox?.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const fillBtn = container.querySelector('.price-compare-fill-selected-btn')
    expect(fillBtn).not.toBeNull()
    await act(async () => {
      fillBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    // 弹出层: 先选品牌列(唯一品牌 中天), 再选供应商
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-brand',
      '中天',
    )
    await pickOption(
      document.body,
      '.price-compare-supplier-fill-select',
      '河钢',
    )

    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
    // 未选中的行不变
    expect(observed.sheet.inputs['中天:r2']?.supplierName).toBeUndefined()
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

  async function openColumnSettings() {
    const trigger = container.querySelector<HTMLButtonElement>(
      '[aria-label="列显示"]',
    )
    expect(trigger).not.toBeNull()
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('列显示可隐藏备注列', async () => {
    renderStateful({ ...makeSheet() }, [{ ...baseRow }])

    expect(
      container.querySelector('input.price-compare-row-remark'),
    ).not.toBeNull()

    await openColumnSettings()
    const remarkToggle = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.price-compare-column-settings .ant-checkbox-wrapper',
      ),
    ).find((el) => el.textContent?.includes('备注'))
    expect(remarkToggle).toBeTruthy()
    await act(async () => {
      remarkToggle
        ?.querySelector('input')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(container.querySelector('input.price-compare-row-remark')).toBeNull()
  })

  it('列显示可整组隐藏某个品牌', async () => {
    renderStateful(
      { ...makeSheet() },
      [{ ...baseRow }],
      [],
      [
        { name: '中天', freight: 30 },
        { name: '沙钢', freight: 20 },
      ],
    )

    expect(container.textContent).toContain('中天')
    expect(container.textContent).toContain('沙钢')

    await openColumnSettings()
    const brandToggle = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.price-compare-column-settings .ant-checkbox-wrapper',
      ),
    ).find((el) => el.textContent?.trim() === '沙钢')
    expect(brandToggle).toBeTruthy()
    await act(async () => {
      brandToggle
        ?.querySelector('input')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const headerText =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerText).toContain('中天')
    expect(headerText).not.toContain('沙钢')
  })

  it('勾选行后点击标记为已采购: 行置为已采购并遮蔽吨位后的品牌价格列', async () => {
    const observed = renderStateful(
      makeSheet(),
      [{ ...baseRow, id: 'r1' }],
      suppliers,
    )

    // 初始: 现货价输入可见
    expect(container.querySelector('input[data-spot="中天:r1"]')).not.toBeNull()

    const rowCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-row input[type="checkbox"]',
    )
    await act(async () => {
      rowCheckbox?.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const markBtn = container.querySelector('.price-compare-purchased-btn')
    expect(markBtn).not.toBeNull()
    expect(markBtn?.textContent).toContain('标记为已采购')
    await act(async () => {
      markBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(observed.rows[0].purchased).toBe(true)
    // 品牌价格列被遮蔽: 现货输入消失, 出现遮蔽块
    expect(container.querySelector('input[data-spot="中天:r1"]')).toBeNull()
    expect(
      container.querySelectorAll('.price-compare-purchased-mask').length,
    ).toBeGreaterThan(0)
    expect(
      container.querySelector('tr.price-compare-purchased-row'),
    ).not.toBeNull()
  })

  it('再次点击可取消已采购并恢复品牌价格列', async () => {
    const observed = renderStateful(
      makeSheet(),
      [{ ...baseRow, id: 'r1', purchased: true }],
      suppliers,
    )

    expect(container.querySelector('input[data-spot="中天:r1"]')).toBeNull()

    const rowCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-row input[type="checkbox"]',
    )
    await act(async () => {
      rowCheckbox?.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const unmarkBtn = container.querySelector('.price-compare-purchased-btn')
    expect(unmarkBtn?.textContent).toContain('取消已采购')
    await act(async () => {
      unmarkBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(observed.rows[0].purchased).toBeUndefined()
    expect(container.querySelector('input[data-spot="中天:r1"]')).not.toBeNull()
  })

  it('隔断行不参与已采购标记', async () => {
    const observed = renderStateful(
      makeSheet(),
      [
        { ...baseRow, id: 'r1' },
        {
          id: 'sep1',
          rowType: 'SEPARATOR',
          category: '',
          material: '',
          spec: null,
          length: '',
        },
      ],
      suppliers,
    )

    const allCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-thead input[type="checkbox"]',
    )
    await act(async () => {
      allCheckbox?.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const markBtn = container.querySelector('.price-compare-purchased-btn')
    await act(async () => {
      markBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(observed.rows[0].purchased).toBe(true)
    // 隔断行不被标记
    expect(observed.rows[1].purchased).toBeUndefined()
    // 隔断行仍渲染分隔带而非遮蔽
    expect(
      container.querySelector('tr.price-compare-separator-row'),
    ).not.toBeNull()
  })
})
