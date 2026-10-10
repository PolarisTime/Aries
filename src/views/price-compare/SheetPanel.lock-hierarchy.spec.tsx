// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

function makeSheet(patch: Partial<PriceSheet> = {}): PriceSheet {
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
    ...patch,
  }
}

const rowA: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
}

const rowB: PriceRow = { ...rowA, id: 'r2' }

/**
 * 锁定层级: 单据(全局) > 行 > 单元格。
 * 四组合覆盖: 都不锁 / 仅全局 / 仅行 / 仅单元格, 另加"全局+行"叠加验证优先级。
 */
describe('SheetPanel 锁定层级与优先级', () => {
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
      await new Promise((resolve) => setTimeout(resolve, 25))
    })
    container.remove()
    document.querySelectorAll('.ant-tooltip').forEach((node) => {
      node.remove()
    })
    // 吨位弹层挂在 body 上, 不清理会污染后续用例的 document.querySelector
    document.querySelectorAll('.ant-popover').forEach((node) => {
      node.remove()
    })
  })

  function renderPanel(
    initialSheet: PriceSheet,
    initialRows: PriceRow[],
    options: { readOnly?: boolean; remark?: string } = {},
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
        readOnly: options.readOnly,
        remark: options.remark,
        onRemarkChange: () => {},
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

  const rowEl = (rowId: string) =>
    container.querySelector<HTMLElement>(`tr[data-row-key="${rowId}"]`)
  const tonInput = (rowId: string) =>
    container.querySelector<HTMLInputElement>(`input[data-ton="${rowId}"]`)
  const specSelect = (rowId: string) =>
    rowEl(rowId)?.querySelector<HTMLElement>(
      '.price-compare-variety-cell .ant-select',
    )
  const rowActionButton = (rowId: string) =>
    rowEl(rowId)?.querySelector<HTMLButtonElement>('.price-compare-row-actions')
  const specReason = (rowId: string) =>
    rowEl(rowId)
      ?.querySelector<HTMLElement>('.price-compare-variety-cell')
      ?.closest<HTMLElement>('.price-compare-lock-reason')
  const tonReason = (rowId: string) =>
    tonInput(rowId)?.closest<HTMLElement>('.price-compare-ton-lock-reason')

  it('组合一: 都不锁时规格与吨位可编辑, 无任何锁定提示', () => {
    renderPanel(makeSheet(), [{ ...rowA }])

    expect(specSelect('r1')?.classList.contains('ant-select-disabled')).toBe(
      false,
    )
    expect(tonInput('r1')?.disabled).toBe(false)
    expect(rowActionButton('r1')?.disabled).toBe(false)
    expect(container.querySelector('#price-compare-lock-reason')).toBeNull()
    expect(specReason('r1')).toBeNull()
    expect(tonReason('r1')).toBeNull()
  })

  it('组合二: 仅全局锁定 → 规格/吨位只读 + 常驻原因 + 禁用控件可追溯到原因', () => {
    renderPanel(makeSheet({ specQuantityLocked: true }), [{ ...rowA }])

    expect(specSelect('r1')?.classList.contains('ant-select-disabled')).toBe(
      true,
    )
    // 锁定后仍保持正常外观(不置灰)的标记类
    expect(
      specSelect('r1')?.classList.contains('price-compare-locked-field'),
    ).toBe(true)
    expect(tonInput('r1')?.disabled).toBe(true)
    expect(
      tonInput('r1')?.classList.contains('price-compare-locked-field'),
    ).toBe(true)

    // 原因必须可见(不静默禁用): 摘要行常驻文案 + 两个新增按钮的 aria-describedby
    const reason = container.querySelector('#price-compare-lock-reason')
    expect(reason?.textContent).toContain('已锁定规格和数量')
    const addRow = container.querySelector<HTMLButtonElement>(
      '.price-compare-add-row',
    )
    const addSeparator = container.querySelector<HTMLButtonElement>(
      '.price-compare-add-separator',
    )
    expect(addRow?.disabled).toBe(true)
    expect(addRow?.getAttribute('aria-describedby')).toBe(
      'price-compare-lock-reason',
    )
    expect(addSeparator?.getAttribute('aria-describedby')).toBe(
      'price-compare-lock-reason',
    )

    // 被锁控件自身也能给出来源层级的原因(全局层)
    expect(specReason('r1')?.getAttribute('title')).toContain(
      '已锁定规格和数量',
    )
    expect(tonReason('r1')?.getAttribute('title')).toContain('已锁定规格和数量')

    // 全局锁下菜单仍可打开、逐项禁用并首项说明原因(不静默)
    expect(rowActionButton('r1')?.disabled).toBe(false)
  })

  it('组合三: 仅行锁 → 只冻结该行规格/吨位, 其它行不受影响', () => {
    renderPanel(makeSheet(), [{ ...rowA, locked: true }, { ...rowB }])

    expect(specSelect('r1')?.classList.contains('ant-select-disabled')).toBe(
      true,
    )
    expect(tonInput('r1')?.disabled).toBe(true)
    expect(specSelect('r2')?.classList.contains('ant-select-disabled')).toBe(
      false,
    )
    expect(tonInput('r2')?.disabled).toBe(false)

    // 行级锁原因(层级=row), 且状态图标可见
    expect(specReason('r1')?.getAttribute('title')).toContain('该行已锁定')
    expect(tonReason('r1')?.getAttribute('title')).toContain('该行已锁定')
    expect(rowEl('r1')?.querySelector('.anticon-lock')).not.toBeNull()
    // 行级锁下"解锁该行"入口必须仍可用
    expect(rowActionButton('r1')?.disabled).toBe(false)
    // 仅行锁不产生单据级常驻原因
    expect(container.querySelector('#price-compare-lock-reason')).toBeNull()
  })

  it('组合四: 仅单元格锁(备注有值) → 该字段只读且可解锁, 规格/吨位不受影响', () => {
    renderPanel(makeSheet(), [{ ...rowA }], { remark: '含运费' })

    const remark = container.querySelector<HTMLInputElement>(
      '.price-compare-meta-input',
    )
    expect(remark?.readOnly).toBe(true)
    // 只读语义要显式声明, 否则读屏用户只以为"没反应"
    expect(remark?.getAttribute('aria-readonly')).toBe('true')
    // 解锁入口的可访问名必须带字段名(同页多个可锁定字段时读屏才分得清)
    const unlock = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.price-compare-meta-field button',
      ),
    ).find((button) => button.textContent === '解锁')
    expect(unlock?.getAttribute('aria-label')).toBe('解锁「备注信息」')

    // 单元格锁与单据/行锁作用域不重叠: 规格与吨位保持可编辑
    expect(specSelect('r1')?.classList.contains('ant-select-disabled')).toBe(
      false,
    )
    expect(tonInput('r1')?.disabled).toBe(false)
    expect(container.querySelector('#price-compare-lock-reason')).toBeNull()

    act(() => {
      unlock?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(remark?.readOnly).toBe(false)
  })

  it('全局锁 + 行锁叠加: 原因取最高层级(单据), 行锁状态仍可见', () => {
    renderPanel(makeSheet({ specQuantityLocked: true }), [
      { ...rowA, locked: true },
    ])

    expect(specReason('r1')?.getAttribute('title')).toContain(
      '已锁定规格和数量',
    )
    expect(tonReason('r1')?.getAttribute('title')).toContain('已锁定规格和数量')
    expect(
      container.querySelector('#price-compare-lock-reason')?.textContent,
    ).toContain('已锁定规格和数量')
    expect(rowEl('r1')?.querySelector('.anticon-lock')).not.toBeNull()
  })

  it('全局锁即整单定稿: 未加行级锁的行也能直接关联采购订单', async () => {
    // 缺陷回归: 工具栏「锁定规格和数量」已冻结整单规格/吨位, 但吨位弹层曾只认行级锁,
    // 一边禁用「选择采购订单」一边提示"请先锁定该行" —— 而行菜单的「锁定该行」在全局锁下
    // 又是禁用的, 用户无路可走。单据级锁定必须与吨位输入同口径放行关联。
    renderPanel(makeSheet({ specQuantityLocked: true }), [{ ...rowA }])

    const info = rowEl('r1')?.querySelector<HTMLElement>(
      '.price-compare-ton-info',
    )
    expect(info).not.toBeNull()
    await act(async () => {
      info?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover).not.toBeNull()
    expect(popover?.textContent).toContain('未关联采购订单')
    expect(popover?.textContent).not.toContain('请先锁定')
    const pickerButton = popover?.querySelector<HTMLButtonElement>('button')
    expect(pickerButton?.disabled).toBe(false)
  })

  it('既未加行级锁也未锁单据时, 关联入口仍禁用并提示先锁定', async () => {
    renderPanel(makeSheet(), [{ ...rowA }])

    const info = rowEl('r1')?.querySelector<HTMLElement>(
      '.price-compare-ton-info',
    )
    await act(async () => {
      info?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover?.textContent).toContain('请先锁定')
    const pickerButton = popover?.querySelector<HTMLButtonElement>('button')
    expect(pickerButton?.disabled).toBe(true)
  })

  it('只读(他人签出)时关联入口禁用, 原因指向只读而不是"请先锁定"', async () => {
    renderPanel(makeSheet({ specQuantityLocked: true }), [{ ...rowA }], {
      readOnly: true,
    })

    const info = rowEl('r1')?.querySelector<HTMLElement>(
      '.price-compare-ton-info',
    )
    await act(async () => {
      info?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })

    const popover = document.querySelector('.price-compare-ton-popover')
    const pickerButton = popover?.querySelector<HTMLButtonElement>('button')
    expect(pickerButton?.disabled).toBe(true)
    expect(popover?.textContent).toContain('正被他人编辑')
    expect(popover?.textContent).not.toContain('请先锁定')
  })

  it('只读(他人签出)时原因文案是只读原因, 且不套用锁定外观标记', () => {
    renderPanel(makeSheet({ specQuantityLocked: true }), [{ ...rowA }], {
      readOnly: true,
    })

    expect(
      container.querySelector('#price-compare-lock-reason')?.textContent,
    ).toContain('正被他人编辑')
    // 只读态保持置灰表现(既有口径): 不套用"看起来仍可编辑"的锁定标记类
    expect(container.querySelector('.price-compare-locked-field')).toBeNull()
    // 只读时行操作入口整体禁用, 但仍给出原因(title 承接 hover)
    expect(rowActionButton('r1')?.disabled).toBe(true)
    expect(
      container
        .querySelector('.price-compare-row-actions-wrap')
        ?.getAttribute('title'),
    ).toContain('正被他人编辑')
  })
})
