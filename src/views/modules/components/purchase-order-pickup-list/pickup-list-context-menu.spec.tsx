// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { TableColumnsType } from 'antd'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import type { PickupListRow } from './pickup-list-draft'
import { PickupDraftGroupSection } from './pickup-list-drag-rows'
import { SortableRow } from './pickup-list-sortable'

function buildItem(
  overrides: Partial<PurchaseOrderPickupListItem>,
): PurchaseOrderPickupListItem {
  return {
    itemId: '1',
    orderId: '1',
    orderNo: 'PO-1',
    lineNo: 1,
    warehouseId: 'w1',
    warehouseName: '一号仓',
    brand: '品牌',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    pickupQuantity: 2,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.2,
    ...overrides,
  }
}

function buildRow(overrides: Partial<PickupListRow> = {}): PickupListRow {
  const item = overrides.item ?? buildItem({})
  return {
    rowId: item.itemId,
    baseItemId: item.itemId,
    item,
    quantity: item.pickupQuantity,
    weightTon: item.pickupWeightTon,
    partIndex: 0,
    partCount: 1,
    ...overrides,
  }
}

const columns: TableColumnsType<PickupListRow> = [
  { title: '仓库', key: 'warehouseName', width: 112 },
  { title: '数量', dataIndex: 'quantity', width: 72 },
]

const baseProps = {
  columns,
  // 明细行菜单挂在行容器(components.body.row)上, 与浮层真实接线一致
  components: { body: { row: SortableRow } },
  emptyText: '暂无明细',
  group: { id: 'g1', locked: false, remark: '', itemIds: ['1'] },
  groupCount: 2,
  index: 0,
  rows: [buildRow()],
  onLockedChange: vi.fn(),
  onMerge: vi.fn(),
  onQuantityChange: vi.fn(),
  onRemarkChange: vi.fn(),
  onRemove: vi.fn(),
  onRemovePart: vi.fn(),
  onMoveGroup: vi.fn(),
  onMoveRow: vi.fn(),
  onSplit: vi.fn(),
}

describe('提货清单右键菜单', () => {
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

  const renderSection = (
    props: Partial<Parameters<typeof PickupDraftGroupSection>[0]> = {},
  ) => {
    act(() => {
      root.render(
        createElement(
          DndContext,
          null,
          createElement(PickupDraftGroupSection, {
            ...baseProps,
            ...props,
          }),
        ),
      )
    })
  }

  /** 等 antd 弹层挂载与焦点迁移落地。 */
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

  /**
   * 等价于 `fireEvent.contextMenu`。
   * 仓库未安装 @testing-library/react(不得改 package.json), 因此直接派发原生事件。
   */
  const fireContextMenu = (target: Element | null) => {
    act(() => {
      target?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
  }

  const openContextMenu = async (target: Element | null) => {
    fireContextMenu(target)
    await flush()
  }

  const menuItems = () => [
    ...document.querySelectorAll<HTMLElement>('.ant-dropdown-menu-item'),
  ]
  /** `.ant-dropdown-menu-item-danger` 也匹配 `.ant-dropdown-menu-item` 前缀, 用类名精确判定。 */
  const menuLabels = () => menuItems().map((item) => item.textContent)
  const menuRoot = () => document.querySelector('.ant-dropdown-menu')
  const firstRowCell = () =>
    container.querySelector('.ant-table-tbody tr.ant-table-row td')
  /** 第 rowIndex 行(从 0 起)的首个单元格。 */
  const rowCell = (rowIndex: number) => {
    const rows = container.querySelectorAll('.ant-table-tbody tr.ant-table-row')
    return rows[rowIndex]?.querySelector('td')
  }
  /** 两份的拆分对: rowId 为 '1' 与 '1#1'。 */
  const splitPartRows = () => [
    buildRow({ rowId: '1', partIndex: 0, partCount: 2, quantity: 1 }),
    buildRow({ rowId: '1#1', partIndex: 1, partCount: 2, quantity: 1 }),
  ]
  const clickMenuItem = (label: string) => {
    const target = menuItems().find((item) => item.textContent === label)
    act(() => {
      target?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  describe('明细行菜单', () => {
    it('未拆分行: 菜单可访问名带品名, 仅提供「拆分数量…」不含「移除第 N 行」', async () => {
      renderSection()
      await openContextMenu(firstRowCell())

      const menu = menuRoot()
      expect(menu?.getAttribute('role')).toBe('menu')
      expect(menu?.getAttribute('aria-label')).toBe(
        '「螺纹钢 HRB400E」明细行操作菜单',
      )
      // 会打开拆分弹窗, 按 APG 惯例带省略号(可见按钮文案仍是「拆分数量」)
      expect(menuLabels()).toEqual(['拆分数量…', '上移', '下移'])
      expect(menuItems()[0].getAttribute('aria-disabled')).not.toBe('true')
    })

    it('未拆分且数量不足 2 件: 拆分项禁用', async () => {
      renderSection({ rows: [buildRow({ quantity: 1 })] })
      await openContextMenu(firstRowCell())
      expect(menuLabels()).toEqual(['拆分数量…', '上移', '下移'])
      expect(menuItems()[0].getAttribute('aria-disabled')).toBe('true')
    })

    it('点击「拆分数量…」调用 onSplit 并带上该行', async () => {
      renderSection()
      await openContextMenu(firstRowCell())
      clickMenuItem('拆分数量…')
      await flush()
      expect(baseProps.onSplit).toHaveBeenCalledTimes(1)
      expect(baseProps.onSplit).toHaveBeenCalledWith(
        expect.objectContaining({ rowId: '1' }),
      )
    })

    it('已拆分行: 提供「合并拆分」与「移除第 2 行」, 两份时合并禁用且移除为破坏性', async () => {
      renderSection({ rows: splitPartRows() })
      await openContextMenu(rowCell(1))

      expect(menuRoot()?.getAttribute('aria-label')).toBe(
        '「螺纹钢 HRB400E 第 2/2 份」明细行操作菜单',
      )
      expect(menuLabels()).toEqual(['合并拆分', '移除第 2 行', '上移', '下移'])
      const [merge, removePart] = menuItems()
      expect(merge.getAttribute('aria-disabled')).toBe('true')
      expect(removePart.getAttribute('aria-disabled')).not.toBe('true')
      expect(removePart.className).toContain('ant-dropdown-menu-item-danger')
    })

    it('三份以上时合并项可用', async () => {
      const rows = [0, 1, 2].map((partIndex) =>
        buildRow({
          rowId: partIndex === 0 ? '1' : `1#${partIndex}`,
          partIndex,
          partCount: 3,
          quantity: 3,
        }),
      )
      renderSection({ rows })
      await openContextMenu(rowCell(0))
      expect(menuItems()[0].getAttribute('aria-disabled')).not.toBe('true')
    })

    it('点击「移除第 2 行」调用 onRemovePart 并带上该份', async () => {
      renderSection({ rows: splitPartRows() })
      await openContextMenu(rowCell(1))
      clickMenuItem('移除第 2 行')
      await flush()
      expect(baseProps.onRemovePart).toHaveBeenCalledWith(
        expect.objectContaining({ rowId: '1#1' }),
      )
    })

    it('数量输入框上右键不打开菜单(不被劫持)', async () => {
      renderSection({ rows: splitPartRows() })
      await openContextMenu(
        container.querySelector('.purchase-pickup-list-quantity-input input'),
      )
      expect(menuRoot()).toBeNull()
    })

    it('行「上移/下移」按边界禁用, 点击可用项回调 onMoveRow', async () => {
      // 两行: 第一行上移禁用, 第二行下移禁用
      const rows = [buildRow({ rowId: '1' }), buildRow({ rowId: '2' })]
      renderSection({
        rows,
        group: { id: 'g1', locked: false, remark: '', itemIds: ['1', '2'] },
      })

      await openContextMenu(rowCell(0))
      expect(menuItems()[1]?.getAttribute('aria-disabled')).toBe('true')
      clickMenuItem('下移')
      expect(baseProps.onMoveRow).toHaveBeenCalledWith(
        expect.objectContaining({ rowId: '1' }),
        'down',
      )
    })

    it('明细行 Shift+F10 可唤出行菜单(键盘等价路径)', async () => {
      renderSection()
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
      expect(menuRoot()?.getAttribute('role')).toBe('menu')
    })
  })

  describe('分组头菜单', () => {
    const groupHeader = () =>
      container.querySelector('.purchase-pickup-list-group-header')

    it('分组头右键: 菜单可访问名为分组名, 含锁定与移除分组', async () => {
      renderSection()
      await openContextMenu(groupHeader())

      const menu = menuRoot()
      expect(menu?.getAttribute('role')).toBe('menu')
      expect(menu?.getAttribute('aria-label')).toBe('「分组 1」操作菜单')
      expect(menuLabels()).toEqual([
        '锁定分组 1',
        '分组上移',
        '分组下移',
        '移除分组 1',
      ])
      // 破坏性项按标签定位, 不再依赖下标(菜单中间已插入上移/下移)
      const removeItem = menuItems().at(-1)
      expect(removeItem?.className).toContain('ant-dropdown-menu-item-danger')
      expect(removeItem?.getAttribute('aria-disabled')).not.toBe('true')
    })

    it('分组头 Shift+F10 可唤出分组菜单(键盘等价路径)', async () => {
      renderSection()
      act(() => {
        container
          .querySelector('.purchase-pickup-list-group-title')
          ?.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'F10',
              shiftKey: true,
              bubbles: true,
            }),
          )
      })
      await flush()
      expect(menuRoot()?.getAttribute('aria-label')).toBe('「分组 1」操作菜单')
    })

    it('分组「上移/下移」按边界禁用, 点击可用项回调 onMoveGroup', async () => {
      // index=0 且 groupCount=2: 上移禁用、下移可用
      renderSection()
      const header = container.querySelector(
        '.purchase-pickup-list-group-header',
      )
      await openContextMenu(header)
      expect(menuItems()[1]?.getAttribute('aria-disabled')).toBe('true')
      clickMenuItem('分组下移')
      expect(baseProps.onMoveGroup).toHaveBeenCalledWith('g1', 'down')
    })
    it('已锁定分组提供「解除锁定分组」并调用 onLockedChange(false)', async () => {
      renderSection({
        group: { id: 'g1', locked: true, remark: '', itemIds: ['1'] },
      })
      await openContextMenu(groupHeader())
      expect(menuLabels()).toEqual([
        '解除锁定分组 1',
        '分组上移',
        '分组下移',
        '移除分组 1',
      ])
      clickMenuItem('解除锁定分组 1')
      await flush()
      expect(baseProps.onLockedChange).toHaveBeenCalledWith('g1', false)
    })

    it('点击「移除分组 1」调用 onRemove', async () => {
      renderSection()
      await openContextMenu(groupHeader())
      clickMenuItem('移除分组 1')
      await flush()
      expect(baseProps.onRemove).toHaveBeenCalledWith('g1')
    })

    it('唯一分组时移除分组禁用且点击不触发 onRemove', async () => {
      renderSection({ groupCount: 1 })
      await openContextMenu(groupHeader())
      expect(menuItems()[1].getAttribute('aria-disabled')).toBe('true')
      clickMenuItem('移除分组 1')
      await flush()
      expect(baseProps.onRemove).not.toHaveBeenCalled()
    })

    it('分组备注输入框上右键不打开菜单(不被劫持)', async () => {
      renderSection()
      await openContextMenu(
        container.querySelector('.purchase-pickup-list-group-remark input'),
      )
      expect(menuRoot()).toBeNull()
    })
  })
})
