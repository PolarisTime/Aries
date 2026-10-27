// @vitest-environment jsdom

import i18n from 'i18next'
import {
  act,
  createElement,
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ActionItem } from '@/components/TableActions'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  resolveRowMenuSelection,
  useBusinessGridTable,
} from './use-business-grid-table'

/** 隐藏列回调是基元内部闭包, 这里用假 antd app api 捕获提示文案。 */
const antdAppMock = vi.hoisted(() => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/antd-app', () => ({
  message: antdAppMock.message,
  modal: antdAppMock.modal,
}))

const columnSettingsMock = vi.hoisted(() => ({
  savedOrder: [] as string[],
  handleColumnVisibilityChange: vi.fn(),
  handleColumnOrderChange: vi.fn(),
  handleColumnResizeReset: vi.fn(),
}))

vi.mock('@/hooks/useColumnSettingsSupport', () => ({
  useColumnSettingsSupport: () => ({
    columnOrder: columnSettingsMock.savedOrder,
    columnVisibility: {},
    columnSizes: {},
    loaded: true,
    handleColumnOrderChange: columnSettingsMock.handleColumnOrderChange,
    handleColumnVisibilityChange:
      columnSettingsMock.handleColumnVisibilityChange,
    handleColumnResizePreview: vi.fn(),
    handleColumnResizeCommit: vi.fn(),
    handleColumnResizeReset: columnSettingsMock.handleColumnResizeReset,
  }),
}))

vi.mock('@/hooks/useColumnResizing', () => ({
  // 列宽拖拽与本次断言无关: 原样返回列, 保持 title 节点可被直接调用
  useColumnResizing: ({ columns }: { columns: unknown }) => ({
    columns,
    components: undefined,
  }),
}))

vi.mock('@/hooks/useGridColumns', () => ({
  DETAIL_TOGGLE_COLUMN_ID: 'detail-toggle',
  useGridColumns: () => ({
    columns: [
      { id: 'no', header: '单号', meta: {} },
      { id: 'qty', header: '数量', meta: {} },
    ],
    // 明细按钮渲染器由 hook 透出, 实际渲染在 BusinessGridTable 的首位身份列里
    renderRowDetailToggle: () => null,
  }),
}))

const RECORDS = [
  { id: 'r1', no: 'PO-1' },
  { id: 'r2', no: 'PO-2' },
] as unknown as ModuleRecord[]

const CONFIG = {
  key: 'sales-order',
  title: '',
  kicker: '',
  description: '',
  filters: [],
  columns: [
    { title: '单号', dataIndex: 'no' },
    { title: '数量', dataIndex: 'qty' },
  ],
  detailFields: [],
  data: [],
  buildOverview: () => [],
} as unknown as ModulePageConfig

type TableResult = ReturnType<typeof useBusinessGridTable>

/** 从 antd 列头 title 节点里取出对应的 ColumnHeaderMenu 元素。 */
function titleElementOf(
  columns: TableResult['antdColumns'],
  columnTitle: string,
) {
  const column = columns.find((item) => {
    const title = item.title
    return (
      typeof title === 'object' &&
      title !== null &&
      'props' in title &&
      (title as ReactElement<{ columnTitle?: string }>).props.columnTitle ===
        columnTitle
    )
  })
  expect(column).toBeTruthy()
  return column?.title as ReactElement<{ onHide?: () => void }>
}

describe('useBusinessGridTable 列头/行菜单联动', () => {
  let container: HTMLDivElement
  let root: Root
  let keysSpy: ReturnType<typeof vi.fn>
  let mapSpy: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    antdAppMock.message.success.mockClear()
    columnSettingsMock.handleColumnVisibilityChange.mockClear()
    columnSettingsMock.savedOrder = []
    keysSpy = vi.fn()
    mapSpy = vi.fn()
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /*
   * Harness 必须是稳定组件类型: 若每次 renderTable 都新建组件, React 会卸载重挂,
   * useMemo 永远重建, 就无法验证「仅选择集变化不重建行菜单」。
   */
  let captured: TableResult | null = null
  let harnessProps: {
    selectedRowKeys: string[]
    buildActions: (record: ModuleRecord) => ActionItem[]
  } = {
    selectedRowKeys: [],
    buildActions: (record) => [
      {
        key: 'edit',
        label: `编辑${String(record.id)}`,
        onClick: vi.fn(),
      },
    ],
  }

  function Harness() {
    captured = useBusinessGridTable({
      moduleKey: CONFIG.key,
      config: CONFIG,
      records: RECORDS,
      selectedRowKeys: harnessProps.selectedRowKeys,
      setSelectedRowKeys: keysSpy as unknown as Dispatch<
        SetStateAction<string[]>
      >,
      setSelectedRowMap: mapSpy as unknown as (
        updater: (
          prev: Record<string, ModuleRecord>,
        ) => Record<string, ModuleRecord>,
      ) => void,
      buildActions: harnessProps.buildActions,
    })
    return null
  }

  function renderTable(
    selectedRowKeys: string[],
    buildActions: (record: ModuleRecord) => ActionItem[] = (record) => [
      {
        key: 'edit',
        label: `编辑${String(record.id)}`,
        onClick: vi.fn(),
      },
    ],
  ): TableResult {
    harnessProps = { selectedRowKeys, buildActions }
    act(() => {
      root.render(createElement(Harness))
    })
    return captured as unknown as TableResult
  }

  it('仅选择集变化时不重建行菜单查找表(避免 O(行×动作) 重建)', () => {
    const stableBuildActions = (record: ModuleRecord): ActionItem[] => [
      { key: 'edit', label: `编辑${String(record.id)}`, onClick: () => {} },
    ]
    const first = renderTable([], stableBuildActions)
    const second = renderTable(['r1'], stableBuildActions)

    expect(second.rowContextMenus).toBe(first.rowContextMenus)
  })

  it('打开不在选中集内的行菜单: 只选中该行并在 map 里补该行', () => {
    const table = renderTable([])
    act(() => {
      table.rowContextMenus.get('r2')?.onOpen?.()
    })
    expect(keysSpy).toHaveBeenCalledWith(['r2'])
    const updater = mapSpy.mock.calls.at(-1)?.[0] as (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>
    expect(typeof updater).toBe('function')
    expect(Object.keys(updater({ r1: RECORDS[0], r2: RECORDS[1] }))).toEqual([
      'r2',
    ])
  })

  it('打开已在选中集内的行菜单: 保持多选不动', () => {
    const table = renderTable(['r1', 'r2'])
    keysSpy.mockClear()
    act(() => {
      table.rowContextMenus.get('r1')?.onOpen?.()
    })
    expect(keysSpy).not.toHaveBeenCalled()
  })

  it('业务列表不再渲染行尾「操作列」: 行级动作只走右键/长按/键盘菜单', () => {
    const table = renderTable([])
    const keys = table.antdColumns.map((column) => String(column.key))
    expect(keys).not.toContain('actions')
    expect(
      table.antdColumns.some(
        (column) => column.className === 'sticky-actions-col',
      ),
    ).toBe(false)
    // 行菜单入口仍在(否则行级动作就彻底没有入口了)
    expect(table.rowContextMenus.size).toBe(2)
    const body = table.components?.body as { row?: unknown } | undefined
    expect(body?.row).toBeDefined()
  })

  it('历史列顺序里残留的「操作列」id 会被剔除, 不参与列边界判断', () => {
    // 旧版本把行尾操作列持久化进列顺序, 移除该列后必须过滤掉这条脏数据
    columnSettingsMock.savedOrder = ['actions', 'qty', 'no']
    const table = renderTable([])
    expect(table.columnOrder).toEqual(['qty', 'no'])
    expect(table.columnVisibleKeys).toEqual(['qty', 'no'])
  })

  it('隐藏列成功后提示列名与恢复入口', () => {
    const table = renderTable([])
    const title = titleElementOf(table.antdColumns, '单号')
    act(() => {
      title.props.onHide?.()
    })
    expect(
      columnSettingsMock.handleColumnVisibilityChange,
    ).toHaveBeenCalledTimes(1)
    expect(antdAppMock.message.success).toHaveBeenCalledWith(
      '已隐藏「单号」，可在列设置里恢复',
    )
  })

  /**
   * antd v6 的表头/行内复选框默认可访问名是硬编码英文(Select all / Select row N),
   * 中文界面下读屏播报英文; 这里锁定通用列表 rowSelection 已覆盖成本项目 i18n 文案。
   */
  it('行选择复选框使用中文可访问名, 行名带单号', () => {
    const table = renderTable([])
    expect(table.rowSelection?.getTitleCheckboxProps?.()).toEqual({
      'aria-label': '全选当前页所有行',
    })
    expect(table.rowSelection?.getCheckboxProps?.(RECORDS[0])).toEqual({
      'aria-label': '选择此行：PO-1',
    })
  })

  it('英文界面下同一入口输出英文可访问名', async () => {
    await i18n.changeLanguage('en-US')
    const table = renderTable([])
    expect(table.rowSelection?.getTitleCheckboxProps?.()).toEqual({
      'aria-label': 'Select all rows on this page',
    })
    expect(table.rowSelection?.getCheckboxProps?.(RECORDS[1])).toEqual({
      'aria-label': 'Select this row: PO-2',
    })
  })

  it('行名回退顺序: 单号缺失时依次尝试订单号与主键', () => {
    const table = renderTable([])
    expect(
      table.rowSelection?.getCheckboxProps?.({
        id: 'r9',
        orderNo: 'SO-9',
      }),
    ).toEqual({ 'aria-label': '选择此行：SO-9' })
    expect(table.rowSelection?.getCheckboxProps?.({ id: 'r9' })).toEqual({
      'aria-label': '选择此行：r9',
    })
  })
})

describe('resolveRowMenuSelection —— 行菜单对选中集的唯一口径', () => {
  const record = { id: 'r2' } as unknown as ModuleRecord

  it('分支 1: 菜单所属行已在选中集内时保持多选, 不缩成单行', () => {
    const setSelectedRowKeys = vi.fn()
    const setSelectedRowMap = vi.fn()

    resolveRowMenuSelection({
      record,
      selectedRowKeys: ['r1', 'r2', 'r3'],
      setSelectedRowKeys,
      setSelectedRowMap,
    })

    // 关键断言: 一个 setter 都不能被调用 —— 批量目标保持不变
    expect(setSelectedRowKeys).not.toHaveBeenCalled()
    expect(setSelectedRowMap).not.toHaveBeenCalled()
  })

  it('分支 2: 行不在选中集内时把选中集切换为该行', () => {
    const setSelectedRowKeys = vi.fn()
    const setSelectedRowMap = vi.fn()

    resolveRowMenuSelection({
      record,
      selectedRowKeys: ['r1', 'r3'],
      setSelectedRowKeys,
      setSelectedRowMap,
    })

    expect(setSelectedRowKeys).toHaveBeenCalledWith(['r2'])
    // 选中行映射必须只剩目标行, 否则工具栏会以为还选着别的行
    const updater = setSelectedRowMap.mock.calls[0][0] as (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>
    expect(updater({ r1: { id: 'r1' } })).toEqual({
      r2: record,
    })
  })

  it('分支 2: 空选中集时同样切换为该行', () => {
    const setSelectedRowKeys = vi.fn()
    resolveRowMenuSelection({
      record,
      selectedRowKeys: [],
      setSelectedRowKeys,
      setSelectedRowMap: vi.fn(),
    })
    expect(setSelectedRowKeys).toHaveBeenCalledWith(['r2'])
  })
})

describe('行级动作入口 —— 触屏可用且不再占一列(WCAG 2.2 SC 2.1.1)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function renderWithSelection(): TableResult {
    let captured: TableResult | null = null
    function Harness() {
      captured = useBusinessGridTable({
        moduleKey: CONFIG.key,
        config: CONFIG,
        records: RECORDS,
        selectedRowKeys: [],
        setSelectedRowKeys: vi.fn(),
        setSelectedRowMap: vi.fn(),
        buildActions: (record) => [
          { key: 'edit', label: `编辑${String(record.id)}`, onClick: vi.fn() },
        ],
      })
      return null
    }
    act(() => root.render(createElement(Harness)))
    return captured as unknown as TableResult
  }

  it('列集合里既没有行尾操作列, 也没有独立明细列', () => {
    const table = renderWithSelection()
    const keys = table.antdColumns.map((column) => String(column.key))
    // 两者都已并入 BusinessGridTable 的首位身份列(序号·勾选·明细加号)
    expect(keys).not.toContain('__row-more-actions')
    expect(keys).not.toContain('detail-toggle')
    expect(keys).toEqual(['no', 'qty'])
  })

  it('明细按钮渲染器由 hook 透出, 交给身份列摆放(口径仍在 useGridColumns)', () => {
    const table = renderWithSelection()
    expect(typeof table.renderRowDetailToggle).toBe('function')
  })

  it('行菜单配置仍按行提供(可见「⋮」已移除, 菜单由右键/长按/Shift+F10 打开)', () => {
    const table = renderWithSelection()
    expect(table.rowContextMenus.size).toBe(2)
    expect(table.rowContextMenus.get('r1')?.ariaLabel).toBeTruthy()
  })

  it('勾选状态仍然完整透出(选中键/变更回调/可访问名), 呈现交给身份列', () => {
    const table = renderWithSelection()
    expect(table.rowSelection?.selectedRowKeys).toEqual([])
    expect(typeof table.rowSelection?.onChange).toBe('function')
    expect(table.rowSelection?.preserveSelectedRowKeys).toBe(true)
    // 固定方向/列宽/表头文案改由 BusinessGridTable 注入, 这里不应再重复一份
    expect(table.rowSelection?.columnTitle).toBeUndefined()
    expect(table.rowSelection?.columnWidth).toBeUndefined()
  })
})
