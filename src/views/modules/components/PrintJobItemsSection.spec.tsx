// @vitest-environment jsdom

import { closestCenter, DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PrintRecordItem } from '@/api/system/print-template'
import { rowDragAriaKeyshortcuts } from '@/components/table/row-drag'
import {
  getPrintItemColumnWidth,
  getPrintItemFields,
} from '@/utils/print-module-config'
import { PrintJobItemsSection } from './PrintJobItemsSection'
import type { PrintJobModalAction } from './print-job-modal-state'

/**
 * 打印作业明细行的**非拖动重排替代**(WCAG 2.2 SC 2.5.7)。
 *
 * <p>只挂 dnd-kit KeyboardSensor 不算替代: SC 2.5.7 要求"拖动功能能用单指针在不拖动
 * 的情况下完成"。这里锁定三条:</p>
 * <ol>
 *   <li>行上右键(单指针)能开出「上移 / 下移」菜单, 边界项软禁用;</li>
 *   <li>**不发起任何拖拽**的前提下, 只靠右键 + 点菜单项就能完成一次重排(顺序真的写回);</li>
 *   <li>每行另有**可见、可点击**的上移/下移按钮: 单指针点一下、纯键盘回车都能重排
 *       (SC 2.5.7 的替代入口不能只藏在右键菜单里);</li>
 *   <li>明细不在有序集合里时行号兜底为 ≥1, 序号列不出现 0。</li>
 * </ol>
 *
 * <p>回退验证(实际改错跑过): 把 {@link PrintJobItemsSection} 的
 * `RowContextMenuContext.Provider` 去掉(菜单不再挂到行上)时, 「右键开出上移/下移」
 * 「仅单指针完成一次重排」「Shift+F10 键盘路径」共 3 条变红;
 * 去掉行内顺序列(顺序列 render 返回 null)时, 「仅单指针点按钮」「仅键盘回车」
 * 「按钮边界与命中区」「可访问名带行名」共 4 条变红。</p>
 */

const SNOWFLAKE_A = '1834671234567890123'
const SNOWFLAKE_B = '1834671234567890456'

function buildItem(overrides: Partial<PrintRecordItem>): PrintRecordItem {
  return {
    id: SNOWFLAKE_A,
    recordId: '1',
    brand: '莱钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    quantity: '2',
    pieceWeightTon: '0.1',
    weightTon: '0.2',
    unitPrice: '3800',
    amount: '7600',
    ...overrides,
  }
}

const ITEM_A = buildItem({})
const ITEM_B = buildItem({
  id: SNOWFLAKE_B,
  category: '盘螺',
  material: 'HPB300',
  spec: '8',
})

interface HarnessProps {
  items: PrintRecordItem[]
  /** 显式指定有序 id(用于构造"明细不在有序集合里"的兜底场景); 缺省跟随行状态。 */
  orderedIds?: string[]
  /** 模块 key: 决定打印明细的列集合(默认销售订单, 全量 11 列)。 */
  moduleKey?: string
  onDispatch: (action: PrintJobModalAction) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

/** 与浮层真实接线一致: DndContext + SortableContext 包住明细区, dispatch 写回行序。 */
function Harness({
  items,
  orderedIds,
  moduleKey = 'sales-order',
  onDispatch,
  onDragStart,
  onDragEnd,
}: HarnessProps) {
  const [rows, setRows] = useState(items)
  const ids = orderedIds ?? rows.map((row) => row.id)
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <PrintJobItemsSection
          brandOverrideEnabled={false}
          brandOverridesByItemId={{}}
          dispatch={(action) => {
            onDispatch(action)
            if (action.type === 'setOrderedPrintItemIds') {
              setRows((current) =>
                action.itemIds
                  .map((id) => current.find((row) => row.id === id))
                  .filter((row): row is PrintRecordItem => Boolean(row)),
              )
            }
          }}
          isStatementPrintModule={false}
          itemSelectionEnabled={false}
          mergeMarkersByItemId={{}}
          moduleKey={moduleKey}
          onRetryPrintItems={() => undefined}
          onToggleSplitItem={() => undefined}
          orderedPrintItemIds={ids}
          orderedPrintItems={rows}
          outputPrintItemIdSet={new Set()}
          printItemFields={getPrintItemFields(moduleKey)}
          printItems={rows}
          printItemsError={false}
          selectedPrintItems={rows}
          showMergeGroup={false}
          splitColumnEnabled={false}
          splitItemIds={[]}
        />
      </SortableContext>
    </DndContext>
  )
}

describe('打印明细行的非拖动重排替代', () => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await flush()
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    document.querySelectorAll('.ant-dropdown').forEach((el) => {
      el.remove()
    })
  })

  const render = (
    props: Omit<HarnessProps, 'onDispatch'> & Partial<HarnessProps>,
  ) => {
    const onDispatch =
      props.onDispatch ?? (vi.fn() as (action: PrintJobModalAction) => void)
    act(() => {
      root.render(createElement(Harness, { ...props, onDispatch }))
    })
    return { onDispatch }
  }

  /** 等 antd 弹层挂载与焦点迁移落地。 */
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

  const rowKeys = () =>
    Array.from(
      container.querySelectorAll<HTMLTableRowElement>(
        '.ant-table-tbody tr.ant-table-row',
      ),
    ).map((row) => row.dataset.rowKey)

  const rowCell = (rowIndex: number) =>
    container
      .querySelectorAll('.ant-table-tbody tr.ant-table-row')
      .item(rowIndex)
      ?.querySelector('td') ?? null

  const openContextMenu = async (target: Element | null) => {
    act(() => {
      target?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await flush()
  }

  const menuItems = () => [
    ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
  ]
  const menuLabels = () => menuItems().map((item) => item.textContent)
  const menuRoot = () => document.querySelector('.ant-dropdown-menu')

  const clickMenuItem = (label: string) => {
    const target = menuItems().find((item) => item.textContent === label)
    act(() => {
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('行右键开出顺序菜单(上移/下移/移到最前/最后), 首行的上移类项按边界软禁用', async () => {
    render({ items: [ITEM_A, ITEM_B] })
    await openContextMenu(rowCell(0))

    expect(menuRoot()?.getAttribute('role')).toBe('menu')
    // 可访问名带行名(材质+规格), 读屏用户能确认操作的是哪一行
    expect(menuRoot()?.getAttribute('aria-label')).toBe(
      '「螺纹钢 HRB400E 12」明细行操作菜单',
    )
    expect(menuLabels()).toEqual(['移到最前', '上移', '下移', '移到最后'])
    // 首行: 移到最前与上移都不可用, 下移可用
    expect(menuItems()[0].getAttribute('aria-disabled')).toBe('true')
    expect(menuItems()[1].getAttribute('aria-disabled')).toBe('true')
    expect(menuItems()[2].getAttribute('aria-disabled')).not.toBe('true')
  })

  it('仅单指针(右键 + 点「下移」)即可完成一次重排, 全程不发起拖拽', async () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const { onDispatch } = render({
      items: [ITEM_A, ITEM_B],
      onDragEnd,
      onDragStart,
    })
    expect(rowKeys()).toEqual([SNOWFLAKE_A, SNOWFLAKE_B])

    await openContextMenu(rowCell(0))
    clickMenuItem('下移')
    await flush()

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [SNOWFLAKE_B, SNOWFLAKE_A],
    })
    // 顺序真的写回了行模型(表格行序翻转)
    expect(rowKeys()).toEqual([SNOWFLAKE_B, SNOWFLAKE_A])
    // 没有按下/移动/松开鼠标, 也没有 dnd-kit 的拖动起止
    expect(onDragStart).not.toHaveBeenCalled()
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('行上 Shift+F10 也开得出同一份菜单(键盘等价路径)', async () => {
    render({ items: [ITEM_A, ITEM_B] })
    const row = container.querySelector('.ant-table-tbody tr.ant-table-row')
    act(() => {
      row?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F10',
          shiftKey: true,
          bubbles: true,
        }),
      )
    })
    await flush()
    expect(menuLabels()).toEqual(['移到最前', '上移', '下移', '移到最后'])
  })

  it('末行的下移按边界软禁用, 点击不写回顺序', async () => {
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B] })
    await openContextMenu(rowCell(1))

    // 末行: 下移与移到最后都不可用
    expect(menuItems()[2].getAttribute('aria-disabled')).toBe('true')
    expect(menuItems()[3].getAttribute('aria-disabled')).toBe('true')
    clickMenuItem('下移')
    await flush()
    expect(onDispatch).not.toHaveBeenCalled()
  })

  it('右键「移到最前 / 最后」一步到目标位次, 长距离不用逐格点', async () => {
    const ITEM_C = buildItem({
      id: '1834671234567890789',
      category: '高线',
      material: 'HRB500',
      spec: '10',
    })
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B, ITEM_C] })
    expect(rowKeys()).toEqual([SNOWFLAKE_A, SNOWFLAKE_B, ITEM_C.id])

    // 末行 → 移到最前
    await openContextMenu(rowCell(2))
    clickMenuItem('移到最前')
    await flush()
    expect(onDispatch).toHaveBeenLastCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [ITEM_C.id, SNOWFLAKE_A, SNOWFLAKE_B],
    })
    expect(rowKeys()).toEqual([ITEM_C.id, SNOWFLAKE_A, SNOWFLAKE_B])

    // 首行 → 移到最后
    await openContextMenu(rowCell(0))
    clickMenuItem('移到最后')
    await flush()
    expect(onDispatch).toHaveBeenLastCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [SNOWFLAKE_A, SNOWFLAKE_B, ITEM_C.id],
    })
    expect(rowKeys()).toEqual([SNOWFLAKE_A, SNOWFLAKE_B, ITEM_C.id])
  })

  /** 行内「上移/下移」按钮: 不需要右键、不需要拖动, 单指针直接点。 */
  const moveButton = (rowKey: string, label: string) =>
    Array.from(
      container
        .querySelector<HTMLTableRowElement>(`tr[data-row-key="${rowKey}"]`)
        ?.querySelectorAll<HTMLButtonElement>('button') ?? [],
    ).find((button) =>
      (button.getAttribute('aria-label') ?? '').startsWith(label),
    )

  it('拖动抓手与上移/下移同处「顺序」一格, 不再有第二个空白表头的拖动列', () => {
    render({ items: [ITEM_A, ITEM_B] })

    const row = container.querySelector<HTMLTableRowElement>(
      `tr[data-row-key="${SNOWFLAKE_A}"]`,
    )
    const cells = Array.from(
      row?.querySelectorAll<HTMLTableCellElement>('td') ?? [],
    )
    // 抓手指令与上移/下移按钮在同一格: 一列承载同一能力的两条通道
    const handleCells = cells.filter(
      (cell) => cell.querySelector('button[aria-label^="拖动第"]') !== null,
    )
    expect(handleCells).toHaveLength(1)
    const labels = Array.from(
      handleCells[0]?.querySelectorAll('button') ?? [],
    ).map((button) => button.getAttribute('aria-label') ?? '')
    expect(labels.some((label) => label.startsWith('拖动第'))).toBe(true)
    expect(labels.some((label) => label.startsWith('上移'))).toBe(true)
    expect(labels.some((label) => label.startsWith('下移'))).toBe(true)
  })

  it('仅单指针: 点击行内「下移」按钮完成一次重排, 全程不发起拖拽', () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const { onDispatch } = render({
      items: [ITEM_A, ITEM_B],
      onDragEnd,
      onDragStart,
    })

    act(() => {
      moveButton(SNOWFLAKE_A, '下移')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [SNOWFLAKE_B, SNOWFLAKE_A],
    })
    expect(rowKeys()).toEqual([SNOWFLAKE_B, SNOWFLAKE_A])
    expect(onDragStart).not.toHaveBeenCalled()
    expect(onDragEnd).not.toHaveBeenCalled()
  })

  it('仅键盘: 聚焦行内「上移」按钮按回车完成一次重排', () => {
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B] })
    const button = moveButton(SNOWFLAKE_B, '上移')
    expect(button).toBeDefined()
    act(() => button?.focus())

    act(() => {
      button?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onDispatch).toHaveBeenCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [SNOWFLAKE_B, SNOWFLAKE_A],
    })
    expect(rowKeys()).toEqual([SNOWFLAKE_B, SNOWFLAKE_A])
  })

  it('点击后焦点留在这行的按钮上, 再按回车就能继续移动(不用把鼠标移回去)', () => {
    const ITEM_C = buildItem({
      id: '1834671234567890789',
      category: '高线',
      material: 'HRB500',
      spec: '10',
    })
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B, ITEM_C] })

    const down = moveButton(SNOWFLAKE_A, '下移')
    expect(down).toBeDefined()
    act(() => down?.focus())
    act(() => {
      down?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onDispatch).toHaveBeenCalledTimes(1)

    /*
     * 行移动后按钮随行移动到新位置; 只要 React 复用同一个按钮节点, 焦点就还在它身上,
     * 浏览器里直接按回车(= 触发 click)即可继续移动 —— 这是"手不离键盘"的连续调整路径。
     */
    const focusedLabel =
      document.activeElement?.getAttribute('aria-label') ?? ''
    expect(focusedLabel.startsWith('下移')).toBe(true)

    act(() => {
      document.activeElement?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
    expect(onDispatch).toHaveBeenCalledTimes(2)
    expect(onDispatch).toHaveBeenLastCalledWith({
      type: 'setOrderedPrintItemIds',
      itemIds: [SNOWFLAKE_B, ITEM_C.id, SNOWFLAKE_A],
    })
  })

  it('替代按钮首/末项 aria-disabled、目标 ≥24×24、可访问名带行名', () => {
    render({ items: [ITEM_A, ITEM_B] })

    const firstUp = moveButton(SNOWFLAKE_A, '上移')
    const firstDown = moveButton(SNOWFLAKE_A, '下移')
    const lastDown = moveButton(SNOWFLAKE_B, '下移')

    expect(firstUp?.getAttribute('aria-disabled')).toBe('true')
    expect(firstDown?.getAttribute('aria-disabled')).toBe('false')
    expect(lastDown?.getAttribute('aria-disabled')).toBe('true')
    expect(firstUp?.style.minWidth).toBe('24px')
    expect(firstUp?.style.minHeight).toBe('24px')
    expect(firstDown?.getAttribute('aria-label')).toBe(
      '下移 螺纹钢 HRB400E 12（第 1 行）',
    )
    // 可访问名里不得出现雪花 id
    expect(firstDown?.getAttribute('aria-label')).not.toContain(SNOWFLAKE_A)
  })

  it('拖动把手声明 aria-keyshortcuts, 且与共享键位常量同源', () => {
    render({ items: [ITEM_A, ITEM_B] })
    const handle = container.querySelector<HTMLButtonElement>(
      `tr[data-row-key="${SNOWFLAKE_A}"] button`,
    )
    expect(handle?.getAttribute('aria-keyshortcuts')).toBe(
      rowDragAriaKeyshortcuts(),
    )
    expect(handle?.getAttribute('aria-keyshortcuts')).toContain('Space')
  })

  it('明细不在有序集合里时行号兜底为 1, 不显示 0', () => {
    // 构造"有序集合缺了这一行"的输入: 行号不能再由 indexOf(...)+1 得到
    render({ items: [ITEM_A, ITEM_B], orderedIds: [SNOWFLAKE_B] })

    const row = container.querySelector<HTMLTableRowElement>(
      `tr[data-row-key="${SNOWFLAKE_A}"]`,
    )
    const handle = row?.querySelector('button')
    expect(handle?.getAttribute('aria-label')).toBe('拖动第 1 行打印明细')
    const cells = Array.from(row?.querySelectorAll('td') ?? []).map(
      (cell) => cell.textContent,
    )
    expect(cells).toContain('1')
    expect(cells).not.toContain('0')
  })

  /**
   * 列宽与省略口径：短值列（品牌/材质/金额…）**不省略**，放不下改为横向滚动；
   * 长文本的单号列仍省略。口径来自 `utils/table-column-ellipsis`，宽度来自
   * `utils/print-module-config` —— 组件里不该再有第二份判断或第二个宽度数字。
   *
   * <p>回退验证（实际改错跑过）：把 `ellipsis: columnEllipsis` 改回
   * `ellipsis: true`，「短值列不再一律省略」变红（每个数据列都被加上
   * `ant-table-cell-ellipsis`）；把宽度改回硬编码数字，「列宽取自宽度表」变红。</p>
   */
  describe('打印明细列的省略口径与列宽', () => {
    /** 表头文本 → 该列在 DOM 中的下标（按列名定位，不按下标猜列）。 */
    const headerIndex = (label: string) =>
      Array.from(container.querySelectorAll<HTMLElement>('thead th')).findIndex(
        (cell) => (cell.textContent ?? '').trim() === label,
      )

    const dataCell = (rowIndex: number, label: string) => {
      const row = container
        .querySelectorAll('.ant-table-tbody tr.ant-table-row')
        .item(rowIndex)
      const index = headerIndex(label)
      if (!row || index < 0) return null
      return row.querySelectorAll<HTMLTableCellElement>('td').item(index)
    }

    /** 与表头同属一张表的 `<col>` 宽度（antd 把列宽写在 colgroup 上）。 */
    const renderedColumnWidth = (label: string) => {
      const headers = Array.from(
        container.querySelectorAll<HTMLElement>('thead th'),
      )
      const index = headers.findIndex(
        (cell) => (cell.textContent ?? '').trim() === label,
      )
      const col = headers[0]
        ?.closest('table')
        ?.querySelectorAll<HTMLElement>('colgroup col')
        .item(index)
      return col ? Number.parseFloat(col.style.width) : Number.NaN
    }

    it('短值列不再一律省略: 销售订单明细的每个数据列都不带 ellipsis 类', () => {
      render({ items: [ITEM_A] })
      const labels = getPrintItemFields('sales-order').map((field) =>
        i18n.t(field.labelKey),
      )
      expect(labels).toHaveLength(11)
      for (const label of labels) {
        const cell = dataCell(0, label)
        expect(cell, `列「${label}」没渲染出来`).not.toBeNull()
        expect(cell?.className).not.toContain('ant-table-cell-ellipsis')
      }
    })

    it('长文本单号列仍省略, 短值金额列不省略(收付款单: 来源单号 + 金额)', () => {
      render({ items: [ITEM_A], moduleKey: 'receipt' })
      expect(
        dataCell(0, i18n.t('modules.print.itemSourceNo'))?.className,
      ).toContain('ant-table-cell-ellipsis')
      expect(
        dataCell(0, i18n.t('modules.print.itemAmount'))?.className,
      ).not.toContain('ant-table-cell-ellipsis')
    })

    it('列宽取自唯一宽度表: 每个数据列的渲染宽度等于配置宽度', () => {
      render({ items: [ITEM_A] })
      for (const field of getPrintItemFields('sales-order')) {
        const label = i18n.t(field.labelKey)
        expect(renderedColumnWidth(label), `列「${label}」的渲染宽度`).toBe(
          getPrintItemColumnWidth(field),
        )
      }
    })

    it('数量单位列宽够放表头（原 72px 会把「数量单位」挤换行）', () => {
      render({ items: [ITEM_A] })
      const label = i18n.t('modules.columns.quantityUnit')
      // 表头「数量单位」49 + 单元格左右 padding 24 = 73
      expect(renderedColumnWidth(label)).toBeGreaterThanOrEqual(73)
    })
  })
})
