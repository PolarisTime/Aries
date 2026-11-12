// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { bindAntdAppApi } from '@/utils/antd-app'
import { SheetPanel } from './SheetPanel'
import type { PriceRow, PriceSheet, Variety } from './types'

/**
 * 「从供应商价格表导入」的数据源：默认返回空报价，具体用例各自设置。
 * 用 mock 而不是真请求：导入流程是本用例要验证的行为，不是网络层。
 */
const lowestQuotesMock = vi.fn<() => Promise<unknown[]>>(() =>
  Promise.resolve([]),
)

vi.mock('@/api/market/supplier-price-lists', () => ({
  fetchLowestBrandQuotes: (...args: unknown[]) => {
    void args
    return lowestQuotesMock()
  },
}))

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

/** 列显示偏好的本地存储 key(未登录时 userKey 为 anonymous, 与 useColumnSettingsSupport 一致)。 */
const COLUMN_SETTINGS_KEY =
  'aries-list-column-settings:anonymous:price-compare-sheet'

describe('SheetPanel 指定品牌展示', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    // 列显隐已改为用户偏好持久化(本地存储): 上一个用例隐藏过的列会带到这里,
    // 因此每个用例开始前清掉本页的列设置, 保证用例之间互相隔离。
    window.localStorage.removeItem(
      'aries-list-column-settings:anonymous:price-compare-sheet',
    )
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

  function render(designatedBrands?: string[]) {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
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
        ),
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
    brands: { name: string; freight: number }[] = [
      { name: '中天', freight: 30 },
    ],
    readOnly = false,
    varieties: Variety[] = [variety],
    allowHrb400eFallback = false,
  ) {
    const observed = {
      rows: initialRows,
      sheet: initialSheet,
      /** 测试里直接切锁定态/换行集合的句柄(拖拽状态残留用例需要"不派发 dragend 就改数据")。 */
      patchSheet: (_patch: Partial<PriceSheet>) => {},
      replaceRows: (_updater: (rows: PriceRow[]) => PriceRow[]) => {},
    }
    function Harness() {
      const [sheet, setSheet] = useState(initialSheet)
      const [rows, setRows] = useState(initialRows)
      // 回写放在 effect 里: 渲染期改外层变量会被 React Compiler 判为 immutability 违规
      useEffect(() => {
        observed.rows = rows
        observed.sheet = sheet
        observed.patchSheet = (patch) =>
          setSheet((prev) => ({ ...prev, ...patch }))
        observed.replaceRows = setRows
      }, [rows, sheet])
      return createElement(SheetPanel, {
        sheet,
        data: null,
        varieties,
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
        readOnly,
        allowHrb400eFallback,
      })
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness),
        ),
      )
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
    expect(separatorRow?.querySelector('[data-spot]')).toBeNull()
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

  /**
   * 回归: 吨位/现货输入曾对 Tab 一律 preventDefault, 到列首/列尾找不到目标时
   * 焦点原地不动 —— 单行单据下整列变成焦点陷阱, 现货价与供应商列永远到不了。
   */
  it('吨位列到边界时放行默认 Tab, 不再形成焦点陷阱', () => {
    renderStateful({ ...makeSheet() }, [{ ...baseRow, id: 'r1' }])

    const ton = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const tonTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      ton?.dispatchEvent(tonTab)
    })
    expect(tonTab.defaultPrevented).toBe(false)
  })

  it('吨位列内有下一行时仍拦截默认 Tab 并移动焦点', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow, id: 'r1' },
      { ...baseRow, id: 'r2' },
    ])

    const ton = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const tonTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      ton?.dispatchEvent(tonTab)
    })
    expect(tonTab.defaultPrevented).toBe(true)
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

  it('点击"添加一行"直接追加空行, 商品回落到行内可搜索下拉再选', () => {
    const observed = renderStateful({ ...makeSheet() }, [{ ...baseRow }])

    const addRow = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加一行'),
    )
    expect(addRow).toBeTruthy()
    act(() => {
      addRow?.click()
    })

    // 空行: 不预填商品, 避免"先选商品才生成行"的长列表交互
    expect(observed.rows).toHaveLength(2)
    const added = observed.rows[1]
    expect(added.rowType).toBe('PRODUCT')
    expect(added.category).toBe('')
    expect(added.material).toBe('')
    expect(added.spec).toBeNull()
    expect(added.length).toBe('')
    expect(added.id).not.toBe(observed.rows[0].id)

    // 行内商品下拉(可搜索)每行一个, 新增行同样具备编辑入口
    const varietySelects = container.querySelectorAll(
      '.price-compare-variety-cell .ant-select',
    )
    expect(varietySelects.length).toBeGreaterThanOrEqual(2)
  })

  /**
   * 合成一次 HTML5 拖拽: `dragstart` + 目标行下半的 `dragover`, **刻意不派发 `dragend`**。
   *
   * <p>真实浏览器就是这样丢掉 `dragend` 的(拖拽中途被锁定、被拖节点被重建、窗口失焦),
   * 于是 `dragId/dropId/dropAfter` 会永久残留成行上的落点线与 dragging 类。</p>
   */
  function startRowDragWithoutDragEnd() {
    const rowNodes = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(
          '.price-compare-tbody > tr.ant-table-row, .price-compare-table .ant-table-tbody > tr.ant-table-row',
        ),
      )
    expect(rowNodes().length).toBeGreaterThanOrEqual(2)
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: () => {},
      getData: () => 'r1',
      setDragImage: () => {},
    }
    const fire = (element: Element, type: string, clientY: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      // jsdom 没有 DragEvent/DataTransfer: 按原生事件形状补上 React 合成事件读取的字段
      Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
      Object.defineProperty(event, 'clientY', { value: clientY })
      element.dispatchEvent(event)
    }
    act(() => {
      const handle = rowNodes()[0].querySelector('.price-compare-row-drag')
      expect(handle).not.toBeNull()
      fire(handle as Element, 'dragstart', 0)
    })
    act(() => {
      fire(rowNodes()[1], 'dragover', 100)
    })
  }

  const dragResidueCount = () =>
    container.querySelectorAll(
      'tr.price-compare-dragging, tr.price-compare-drop-after, tr.price-compare-drop-before',
    ).length

  it('拖拽中途切换锁定态: 没收到 dragend 也必须清掉 dragging 与落点类', () => {
    const observed = renderStateful({ ...makeSheet() }, [
      { ...baseRow },
      { ...baseRow, id: 'r2' },
    ])
    startRowDragWithoutDragEnd()
    expect(container.querySelector('tr.price-compare-dragging')).not.toBeNull()
    expect(
      container.querySelector(
        'tr.price-compare-drop-after, tr.price-compare-drop-before',
      ),
    ).not.toBeNull()

    // 真实路径: 拖拽中途点「锁定规格和数量」→ 浏览器可能不再派发 dragend
    act(() => observed.patchSheet({ specQuantityLocked: true }))
    expect(dragResidueCount()).toBe(0)
  })

  it('拖拽中途行集合变化(增删行/换单): 没收到 dragend 也要清掉落点类', () => {
    const observed = renderStateful({ ...makeSheet() }, [
      { ...baseRow },
      { ...baseRow, id: 'r2' },
    ])
    startRowDragWithoutDragEnd()
    expect(dragResidueCount()).toBeGreaterThan(0)

    act(() => {
      observed.replaceRows((prev) => [...prev, { ...baseRow, id: 'r3' }])
    })
    expect(dragResidueCount()).toBe(0)
  })

  it('Escape 与窗口失焦都会清掉拖拽状态(丢 dragend 的两条常见路径)', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow },
      { ...baseRow, id: 'r2' },
    ])
    startRowDragWithoutDragEnd()
    expect(dragResidueCount()).toBeGreaterThan(0)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(dragResidueCount()).toBe(0)

    // 再拖一次, 改用窗口失焦(切标签/点桌面)
    startRowDragWithoutDragEnd()
    expect(dragResidueCount()).toBeGreaterThan(0)
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(dragResidueCount()).toBe(0)
  })

  it('规格数量锁定后禁用新增/删除/拖拽重排并给出提示', () => {
    renderStateful({ ...makeSheet(), specQuantityLocked: true }, [
      { ...baseRow },
    ])

    // 整行不可拖(拖拽由 <tr> 承载), 手柄降级为禁用样式
    const row = container.querySelector(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    )
    expect(row?.getAttribute('draggable')).toBe('false')
    expect(
      container
        .querySelector('.price-compare-row-drag')
        ?.classList.contains('price-compare-row-drag-disabled'),
    ).toBe(true)

    // 新增行入口禁用
    const addRow = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加一行'),
    )
    expect(addRow?.disabled).toBe(true)

    // 行操作入口: 「锁定规格和数量」只逐项禁用会改动规格/数量的菜单项,
    // 菜单本身仍可打开(用户点得开、看得见为什么点不动), 因此触发器不禁用
    expect(
      container.querySelector<HTMLButtonElement>('.price-compare-row-actions')
        ?.disabled,
    ).toBe(false)

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

    const row = container.querySelector(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    )
    expect(row?.getAttribute('draggable')).toBe('true')
    expect(
      container
        .querySelector('.price-compare-row-drag')
        ?.classList.contains('price-compare-row-drag-disabled'),
    ).toBe(false)

    const addRow = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('添加一行'),
    )
    expect(addRow?.disabled).toBe(false)
  })

  it('在类别列之前渲染行备注列, 且备注显示到输入框', () => {
    renderStateful({ ...makeSheet() }, [{ ...baseRow, remark: '急单' }])

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

  it('报单吨位合计放在表格最后一行的合计行里, 不再挤在列头', () => {
    renderStateful({ ...makeSheet() }, [
      { ...baseRow, id: 'r1', ton: 1.5 },
      { ...baseRow, id: 'r2', ton: 2.25 },
    ])

    // 列头只留列名: 早先「报单吨位 合计 260」两段挤一行, 列名被省略号截成「报..合计 260」
    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[0]?.textContent ?? ''
    expect(headerRow).toContain('报单吨位')
    expect(headerRow).not.toContain('合计')

    // 合计行是表格最后一行(summary 的第二个 Row), 数值填在吨位列下
    const summaryRows = container.querySelectorAll('.ant-table-summary tr')
    const totalRow = summaryRows[summaryRows.length - 1]
    expect(totalRow?.className).toContain('price-compare-ton-total-row')
    expect(totalRow?.textContent).toContain('合计')
    expect(totalRow?.textContent).toContain('3.75')
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
      '[aria-label^="列显示"]',
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

  it('列显示可隐藏备注列, 且隐藏结果写入用户偏好(本地存储)', async () => {
    renderStateful(
      { ...makeSheet() },
      [{ ...baseRow }],
      [{ name: '中天', freight: 30 }],
    )
    const headerTextOf = () =>
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerTextOf()).toContain('备注')
    // 报单吨位列是必填列, 不参与显隐
    expect(headerTextOf()).toContain('报单吨位')

    await openColumnSettings()
    const toggle = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.price-compare-column-settings .ant-checkbox-wrapper',
      ),
    ).find((el) => el.textContent?.trim() === '备注')
    expect(toggle).toBeTruthy()
    await act(async () => {
      toggle
        ?.querySelector('input')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(headerTextOf()).not.toContain('备注')
    expect(headerTextOf()).toContain('报单吨位')

    const stored = JSON.parse(
      window.localStorage.getItem(COLUMN_SETTINGS_KEY) ?? '{}',
    )
    expect(stored.hiddenKeys).toEqual(expect.arrayContaining(['remark']))
    window.localStorage.removeItem(COLUMN_SETTINGS_KEY)
  })

  it('本地已有隐藏记录时, 重新打开页面默认就是隐藏的(刷新不再复位)', () => {
    window.localStorage.setItem(
      COLUMN_SETTINGS_KEY,
      JSON.stringify({ orderedKeys: [], hiddenKeys: ['remark'] }),
    )
    renderStateful(
      { ...makeSheet() },
      [{ ...baseRow }],
      [{ name: '中天', freight: 30 }],
    )

    const headerText =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    expect(headerText).not.toContain('备注')
    expect(headerText).toContain('报单吨位')

    window.localStorage.removeItem(COLUMN_SETTINGS_KEY)
  })

  it('列显示开关的文案与它控制的列同名(勾选框标签 = 列头文案)', async () => {
    renderStateful(
      { ...makeSheet() },
      [{ ...baseRow }],
      [{ name: '中天', freight: 30 }],
    )
    await openColumnSettings()
    const labels = Array.from(
      document.body.querySelectorAll<HTMLElement>(
        '.price-compare-column-settings .ant-checkbox-wrapper',
      ),
    ).map((el) => el.textContent?.trim() ?? '')
    const headerText =
      container.querySelector('.ant-table-thead')?.textContent ?? ''
    // 勾选框文案必须能在表头里找到同名文本: 文案与列同一来源。
    for (const label of ['备注', '中天']) {
      expect(labels).toContain(label)
      expect(headerText).toContain(label)
    }
    window.localStorage.removeItem(COLUMN_SETTINGS_KEY)
  })

  /** 构造一个带 dataTransfer 的 dragstart(jsdom 不实现 DragEvent 的该属性)。 */
  const dragStartEvent = () => {
    const event = new Event('dragstart', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'dataTransfer', {
      value: { setData: () => {}, setDragImage: () => {}, effectAllowed: '' },
    })
    return event
  }

  const dataRow = () =>
    container.querySelector<HTMLElement>(
      '.ant-table-tbody tr:not(.ant-table-measure-row)',
    )

  it('整行任意位置都能起拖(不再只认那个手柄)', () => {
    renderStateful(makeSheet(), [{ ...baseRow }])
    const tr = dataRow()
    expect(tr?.getAttribute('draggable')).toBe('true')

    act(() => {
      // 在没有任何控件的单元格上按下(事件目标就是行本身)
      tr?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      tr?.dispatchEvent(dragStartEvent())
    })

    expect(tr?.className).toContain('price-compare-dragging')
  })

  it('在输入控件上按下时不拖行, 把原生行为让给文本选择/下拉', () => {
    renderStateful(makeSheet(), [{ ...baseRow }])
    const tr = dataRow()
    const control = container.querySelector<HTMLElement>(
      '.ant-table-tbody input:not([type="checkbox"])',
    )
    expect(control, '前置条件: 行内应有可编辑输入控件').not.toBeNull()

    let prevented = false
    act(() => {
      control?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      const event = dragStartEvent()
      tr?.dispatchEvent(event)
      prevented = event.defaultPrevented
    })

    expect(prevented, 'dragstart 必须被阻止').toBe(true)
    expect(tr?.className).not.toContain('price-compare-dragging')
  })

  it('西本模式(单虚拟品牌「基准价」)只渲染一组价格列', () => {
    renderStateful(
      makeSheet(),
      [{ ...baseRow, id: 'r1' }],
      [{ name: '基准价', freight: 0 }],
    )

    const thead = container.querySelector('.ant-table-thead')?.textContent ?? ''
    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[1]?.textContent ?? ''
    // 单组: 网价/现货/差价/简称各一次, 且仅一个品牌分组
    expect(headerRow.match(/网价/g)?.length).toBe(1)
    expect(headerRow.match(/现货/g)?.length).toBe(1)
    expect(headerRow.match(/差价/g)?.length).toBe(1)
    expect(headerRow.match(/简称/g)?.length).toBe(1)
    expect(thead).toContain('基准价')
  })
  it('同规格有双长度时显示长度切换按钮(与采购无关)', () => {
    const twoLengths: Variety[] = [
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
        label: 'a',
      },
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '12米',
        label: 'b',
      },
    ]
    renderStateful(makeSheet(), [{ ...baseRow }], undefined, false, twoLengths)
    const switchButton = container.querySelector(
      '.price-compare-variety-switch',
    )
    expect(switchButton).toBeTruthy()
  })

  it('同规格仅一种长度时不显示长度切换按钮', () => {
    renderStateful(makeSheet(), [{ ...baseRow }])
    expect(container.querySelector('.price-compare-variety-switch')).toBeNull()
  })

  it('点击长度切换按钮把该行切到 12米', () => {
    const twoLengths: Variety[] = [
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '9米',
        label: 'a',
      },
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        length: '12米',
        label: 'b',
      },
    ]
    const observed = renderStateful(
      makeSheet(),
      [{ ...baseRow }],
      undefined,
      false,
      twoLengths,
    )
    const switchButton = container.querySelector(
      '.price-compare-variety-switch',
    ) as HTMLButtonElement
    act(() => {
      switchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(observed.rows[0].length).toBe('12米')
  })
  /** 打开某行的「更多操作」菜单并点击指定项(antd 弹层挂在 document.body 上)。 */
  async function clickRowAction(label: string) {
    const trigger = container.querySelector<HTMLButtonElement>(
      '.price-compare-row-actions',
    )
    expect(trigger).not.toBeNull()
    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const item = Array.from(
      document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
    ).find((node) => node.textContent?.includes(label))
    expect(item).toBeTruthy()
    await act(async () => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('行级锁定收在行操作菜单里, 未锁定时触发图标为中性的更多操作', () => {
    renderStateful(makeSheet(), [{ ...baseRow }])
    const trigger = container.querySelector('.price-compare-row-actions')
    expect(trigger).toBeTruthy()
    expect(trigger?.getAttribute('aria-haspopup')).toBe('menu')
    // 未锁定: 走「更多」图标, 不再常驻一个开锁图标
    expect(trigger?.querySelector('.anticon-more')).not.toBeNull()
    expect(trigger?.querySelector('.anticon-lock, .anticon-unlock')).toBeNull()
  })

  it('菜单选择「锁定该行」后回写 locked, 触发图标变为实心锁', async () => {
    const observed = renderStateful(makeSheet(), [{ ...baseRow }])
    await clickRowAction('锁定该行')
    expect(observed.rows[0].locked).toBe(true)
    const trigger = container.querySelector('.price-compare-row-actions')
    expect(trigger?.querySelector('.anticon-lock')).not.toBeNull()
  })

  it('解锁行只清 locked, 吨位与规格原样保留(不与任何业务单据联动)', async () => {
    const observed = renderStateful(makeSheet(), [
      { ...baseRow, ton: 12.5, locked: true },
    ])
    await clickRowAction('解锁该行')
    expect(observed.rows[0].locked).toBe(false)
    expect(observed.rows[0].ton).toBe(12.5)
    expect(observed.rows[0].spec).toBe(12)
  })

  /**
   * 「默认禁止手动改价，无例外」的渲染级契约。
   *
   * <p>现货价与供应商格子里不能再有任何可写控件：input 或下拉一旦存在，用户就能绕过
   * 「从供应商价格表导入」手工改价。这里同时钉住列顺序（网价/现货/差价/简称）与
   * 已删除的三个入口（批量填供应商按钮、表头填入按钮、行级「按 E 价」开关）。</p>
   */
  it('现货/供应商列都是只读文本, 且不再有任何手工改价入口', () => {
    renderStateful(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3280, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [{ ...baseRow, id: 'r1' }],
      [{ name: '中天', freight: 30 }],
      false,
      [variety],
      true,
    )

    // 现货价: 只读 span(保留 data-spot 供 e2e/测试定位), 不是 input
    expect(container.querySelector('input[data-spot]')).toBeNull()
    const spotCell = container.querySelector('[data-spot="中天:r1"]')
    expect(spotCell).not.toBeNull()
    expect(spotCell?.textContent).toContain('3280')

    // 供应商: 只读文本, 不是下拉
    expect(
      container.querySelector('.price-compare-supplier')?.textContent,
    ).toContain('沙钢')
    expect(
      container.querySelector('.price-compare-supplier .ant-select'),
    ).toBeNull()

    // 已删除的手工入口
    expect(
      container.querySelector('.price-compare-supplier-fill-btn'),
    ).toBeNull()
    expect(
      container.querySelector('.price-compare-fill-selected-btn'),
    ).toBeNull()
    expect(container.querySelector('.price-compare-hrb400e-switch')).toBeNull()

    // 列顺序仍是 网价 / 现货 / 差价 / 简称
    const headerRow =
      container.querySelectorAll('.ant-table-thead tr')[1]?.textContent ?? ''
    expect(headerRow.indexOf('网价')).toBeLessThan(headerRow.indexOf('现货'))
    expect(headerRow.indexOf('现货')).toBeLessThan(headerRow.indexOf('差价'))
    expect(headerRow.indexOf('差价')).toBeLessThan(headerRow.indexOf('简称'))
  })

  it('选中行后只剩删除入口, 没有批量填入供应商按钮', async () => {
    renderStateful(makeSheet(), [{ ...baseRow, id: 'r1' }])
    const rowCheckbox = container.querySelector<HTMLInputElement>(
      '.ant-table-row input[type="checkbox"]',
    )
    await act(async () => {
      rowCheckbox?.click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(
      container.querySelector('.price-compare-fill-selected-btn'),
    ).toBeNull()
    expect(container.textContent).not.toContain('批量填入供应商')
  })
})

/**
 * 「差价最优」并列高亮的渲染级回归。
 *
 * <p>真实缺陷: 差价相同时只有遍历到的第一个品牌被标蓝, 其余并列品牌既不标蓝、还会被
 * 当成"非最优"淡出。这里走完整渲染 + 真实点击, 断言并列品牌**全部**拿到 `is-best`
 * 且都不被淡出 —— 纯函数单测只看返回值, 挡不住"渲染层又只认一个"的回退。</p>
 */
describe('SheetPanel 差价最优并列高亮', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    window.localStorage.removeItem(
      'aries-list-column-settings:anonymous:price-compare-sheet',
    )
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

  /*
   * 三个品牌、同一行、网价与现货价都相同 ⇒ 三家差价完全相等(都为 100-90-0=10)。
   * 若实现只认一个最优, 只会有一个 .is-best。
   */
  function renderTiedRow() {
    const priceRow: PriceRow = {
      id: 'r1',
      rowType: 'PRODUCT',
      category: '螺纹钢',
      material: 'HRB400',
      spec: 16,
      length: '9米',
      ton: 10,
      locked: false,
    }
    const sheet: PriceSheet = {
      ...makeSheet(),
      rows: [priceRow],
      inputs: {
        '中天:r1': { spot: 90 },
        '沙钢:r1': { spot: 90 },
        '永钢:r1': { spot: 90 },
      },
    }
    const data = {
      '2026-09-10': {
        '9:30 上午': {
          中天: { '螺纹钢|HRB400': { '16': 100 } },
          沙钢: { '螺纹钢|HRB400': { '16': 100 } },
          永钢: { '螺纹钢|HRB400': { '16': 100 } },
        },
      },
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(SheetPanel, {
            sheet,
            data,
            varieties: [variety],
            brands: [
              { name: '中天', freight: 0 },
              { name: '沙钢', freight: 0 },
              { name: '永钢', freight: 0 },
            ],
            rows: [priceRow],
            density: 'small',
            lengthPremium: 30,
            patchSheet: () => {},
            setRows: () => {},
            onReorderBrands: () => {},
            periods: [],
            onRefresh: () => {},
            chrome: false,
            spotRef: { current: null },
          }),
        ),
      )
    })
  }

  it('三家差价并列时全部高亮, 且都不被淡出', () => {
    renderTiedRow()
    // 开启「差价最优」
    const bestBtn = Array.from(container.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('差价最优'),
    )
    expect(bestBtn, '未找到「差价最优」按钮').toBeTruthy()
    act(() => bestBtn?.click())

    const cells = Array.from(container.querySelectorAll('.price-compare-diff'))
    expect(cells.length, '应渲染 3 个差价单元格').toBe(3)
    // 反例钉: 旧实现这里只会有 1 个 is-best
    const bestCells = cells.filter((cell) => cell.classList.contains('is-best'))
    expect(bestCells).toHaveLength(3)
    // 并列最优都不应被淡出(淡出等于又只承认一个最优)
    expect(
      bestCells.filter((cell) => cell.classList.contains('price-compare-dim')),
    ).toHaveLength(0)
  })
})

/**
 * 「从供应商价格表导入」的交互契约。
 *
 * <p>覆盖式导入前必须让用户看见影响面（新增/改价（涨跌）/清空/不变/代取，并明确
 * 「未匹配的格子会被清空」）；取消时**不落库**，确认后才 `patchSheet`。价格表里没有任何
 * 报价时文案改成"会清空全部价格"，不让用户以为只是"没东西可导"。</p>
 *
 * <p>数据源用 mock 的 `fetchLowestBrandQuotes`，确认弹窗用假的 `modal.confirm` 捕获，
 * 不去碰真实网络与真实弹层。</p>
 */
describe('SheetPanel 从供应商价格表导入', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  type ConfirmOptions = {
    title?: string
    content?: React.ReactNode
    okText?: string
    onOk?: () => void
  }
  let confirmOptions: ConfirmOptions | null = null
  let successMock: ReturnType<typeof vi.fn>

  const quote = (
    brandName: string,
    spec: number,
    price: number,
    overrides: Record<string, unknown> = {},
  ) => ({
    brandName,
    category: '螺纹钢',
    material: 'HRB400E',
    spec,
    length: '9米',
    price,
    priceListId: '900',
    supplierId: 's2',
    supplierName: '河钢',
    ...overrides,
  })

  const rowAt = (id: string, spec: number): PriceRow => ({
    id,
    rowType: 'PRODUCT',
    category: '螺纹钢',
    material: 'HRB400E',
    spec,
    length: '9米',
  })

  beforeEach(async () => {
    window.localStorage.removeItem(
      'aries-list-column-settings:anonymous:price-compare-sheet',
    )
    await i18n.changeLanguage('zh-CN')
    lowestQuotesMock.mockReset()
    lowestQuotesMock.mockResolvedValue([])
    confirmOptions = null
    successMock = vi.fn()
    bindAntdAppApi({
      modal: {
        confirm: (options: ConfirmOptions) => {
          confirmOptions = options
          return { destroy: () => {}, update: () => {} }
        },
      },
      message: { success: successMock },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    bindAntdAppApi(null)
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
    document
      .querySelectorAll(
        '.ant-dropdown, .ant-popover, .ant-tooltip, .ant-select-dropdown, .ant-modal-root',
      )
      .forEach((node) => {
        node.remove()
      })
  })

  function renderPanel(
    initialSheet: PriceSheet,
    rows: PriceRow[],
    readOnly = false,
  ) {
    const observed: { sheet: PriceSheet } = { sheet: initialSheet }
    function Harness() {
      const [sheet, setSheet] = useState(initialSheet)
      // 回写放在 effect 里: 渲染期改外层变量会被 React Compiler 判为 immutability 违规
      useEffect(() => {
        observed.sheet = sheet
      }, [sheet])
      return createElement(SheetPanel, {
        sheet,
        data: null,
        varieties: [variety],
        brands: [{ name: '中天', freight: 30 }],
        rows,
        density: 'small',
        lengthPremium: 30,
        patchSheet: (_id, patch) => setSheet((prev) => ({ ...prev, ...patch })),
        setRows: () => {},
        onReorderBrands: () => {},
        periods: [],
        onRefresh: () => {},
        chrome: false,
        spotRef: { current: null },
        readOnly,
      })
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness),
        ),
      )
    })
    return observed
  }

  const importButton = () =>
    Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('从供应商价格表导入'),
    )

  async function clickImport() {
    const button = importButton()
    expect(button, '未找到「从供应商价格表导入」按钮').toBeTruthy()
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('覆盖已有价 + 清空未匹配格: 先预览确认, 确认后才落库', async () => {
    lowestQuotesMock.mockResolvedValue([quote('中天', 12, 3420)])
    const observed = renderPanel(
      {
        ...makeSheet(),
        inputs: {
          '中天:r1': { spot: 3200, supplierId: 's1', supplierName: '沙钢' },
          '中天:r2': { spot: 3300, supplierId: 's1', supplierName: '沙钢' },
        },
      },
      [rowAt('r1', 12), rowAt('r2', 16)],
    )

    await clickImport()
    expect(lowestQuotesMock).toHaveBeenCalledTimes(1)
    expect(confirmOptions?.title).toBe('从供应商价格表导入？')
    const content = String(confirmOptions?.content ?? '')
    // 影响面逐项可见, 且明确会清空
    expect(content).toContain('改价 1 处')
    expect(content).toContain('清空 1 处')
    expect(content).toContain('未匹配的格子会被清空')
    // 仅"预览": 未点确定前 inputs 原样
    expect(observed.sheet.inputs['中天:r1']?.spot).toBe(3200)

    act(() => confirmOptions?.onOk?.())

    // 覆盖: 价格与供应商一起按价格表刷新
    expect(observed.sheet.inputs['中天:r1']?.spot).toBe(3420)
    expect(observed.sheet.inputs['中天:r1']?.supplierName).toBe('河钢')
    // 清空: 价格表里没有 r2 的报价 → 整格删除
    expect(observed.sheet.inputs['中天:r2']).toBeUndefined()
    // 成功提示含新增/改价/清空
    expect(successMock).toHaveBeenCalledTimes(1)
    const successText = String(successMock.mock.calls[0]?.[0] ?? '')
    expect(successText).toContain('改价 1 处')
    expect(successText).toContain('清空 1 处')
  })

  it('取消确认时不修改任何输入', async () => {
    lowestQuotesMock.mockResolvedValue([quote('中天', 12, 3420)])
    const observed = renderPanel(
      { ...makeSheet(), inputs: { '中天:r1': { spot: 3200 } } },
      [rowAt('r1', 12)],
    )

    await clickImport()
    expect(confirmOptions).not.toBeNull()
    // 不调用 onOk（等价于点「取消」）
    expect(observed.sheet.inputs['中天:r1']?.spot).toBe(3200)
    expect(successMock).not.toHaveBeenCalled()
  })

  it('价格表没有任何报价时, 确认文案明确会清空全部价格', async () => {
    lowestQuotesMock.mockResolvedValue([])
    const observed = renderPanel(
      { ...makeSheet(), inputs: { '中天:r1': { spot: 3200 } } },
      [rowAt('r1', 12)],
    )

    await clickImport()
    const content = String(confirmOptions?.content ?? '')
    expect(content).toContain('没有任何报价')
    expect(content).toContain('清空全部 1 处')
    expect(content).toContain('未匹配的格子会被清空')

    act(() => confirmOptions?.onOk?.())
    expect(observed.sheet.inputs).toEqual({})
  })

  it('导入后现货格渲染刷新后的只读价格', async () => {
    lowestQuotesMock.mockResolvedValue([quote('中天', 12, 3420)])
    renderPanel({ ...makeSheet(), inputs: { '中天:r1': { spot: 3200 } } }, [
      rowAt('r1', 12),
    ])

    await clickImport()
    act(() => confirmOptions?.onOk?.())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const spotCell = container.querySelector('[data-spot="中天:r1"]')
    expect(spotCell?.textContent).toContain('3420')
    expect(container.querySelector('input[data-spot]')).toBeNull()
  })

  it('只读态下导入按钮禁用', () => {
    renderPanel(makeSheet(), [rowAt('r1', 12)], true)
    expect(importButton()?.disabled).toBe(true)
  })
})
