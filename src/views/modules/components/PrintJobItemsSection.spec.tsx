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
import { getPrintItemFields } from '@/utils/print-module-config'
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
  onDispatch: (action: PrintJobModalAction) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

/** 与浮层真实接线一致: DndContext + SortableContext 包住明细区, dispatch 写回行序。 */
function Harness({
  items,
  orderedIds,
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
          moduleKey="sales-order"
          onRetryPrintItems={() => undefined}
          onToggleSplitItem={() => undefined}
          orderedPrintItemIds={ids}
          orderedPrintItems={rows}
          outputPrintItemIdSet={new Set()}
          printItemFields={getPrintItemFields('sales-order')}
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
      [rowIndex]?.querySelector('td') ?? null

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

  it('行右键开出「上移 / 下移」菜单, 首行的上移按边界软禁用', async () => {
    render({ items: [ITEM_A, ITEM_B] })
    await openContextMenu(rowCell(0))

    expect(menuRoot()?.getAttribute('role')).toBe('menu')
    // 可访问名带行名(材质+规格), 读屏用户能确认操作的是哪一行
    expect(menuRoot()?.getAttribute('aria-label')).toBe(
      '「螺纹钢 HRB400E 12」明细行操作菜单',
    )
    expect(menuLabels()).toEqual(['上移', '下移'])
    expect(menuItems()[0].getAttribute('aria-disabled')).toBe('true')
    expect(menuItems()[1].getAttribute('aria-disabled')).not.toBe('true')
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
    expect(menuLabels()).toEqual(['上移', '下移'])
  })

  it('末行的下移按边界软禁用, 点击不写回顺序', async () => {
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B] })
    await openContextMenu(rowCell(1))

    expect(menuItems()[1].getAttribute('aria-disabled')).toBe('true')
    clickMenuItem('下移')
    await flush()
    expect(onDispatch).not.toHaveBeenCalled()
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

  it('仅单指针: 点击行内「下移」按钮完成一次重排, 全程不发起拖拽', async () => {
    const onDragStart = vi.fn()
    const onDragEnd = vi.fn()
    const { onDispatch } = render({
      items: [ITEM_A, ITEM_B],
      onDragEnd,
      onDragStart,
    })

    await act(async () => {
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

  it('仅键盘: 聚焦行内「上移」按钮按回车完成一次重排', async () => {
    const { onDispatch } = render({ items: [ITEM_A, ITEM_B] })
    const button = moveButton(SNOWFLAKE_B, '上移')
    expect(button).toBeDefined()
    act(() => button?.focus())

    await act(async () => {
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

  it('替代按钮首/末项 aria-disabled、目标 ≥24×24、可访问名带行名', async () => {
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

  it('拖动把手声明 aria-keyshortcuts, 且与共享键位常量同源', async () => {
    render({ items: [ITEM_A, ITEM_B] })
    const handle = container.querySelector<HTMLButtonElement>(
      `tr[data-row-key="${SNOWFLAKE_A}"] button`,
    )
    expect(handle?.getAttribute('aria-keyshortcuts')).toBe(
      rowDragAriaKeyshortcuts(),
    )
    expect(handle?.getAttribute('aria-keyshortcuts')).toContain('Space')
  })

  it('明细不在有序集合里时行号兜底为 1, 不显示 0', async () => {
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
})
