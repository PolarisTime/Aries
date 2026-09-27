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
import { useBusinessGridTable } from './use-business-grid-table'

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
  handleColumnVisibilityChange: vi.fn(),
  handleColumnOrderChange: vi.fn(),
  handleColumnResizeReset: vi.fn(),
}))

vi.mock('@/hooks/useColumnSettingsSupport', () => ({
  useColumnSettingsSupport: () => ({
    columnOrder: [],
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
  ACTION_COLUMN_WIDTH: 120,
  DETAIL_TOGGLE_COLUMN_ID: 'detail-toggle',
  useGridColumns: () => ({
    columns: [
      { id: 'no', header: '单号', meta: {} },
      { id: 'qty', header: '数量', meta: {} },
    ],
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

  function renderTable(selectedRowKeys: string[]): TableResult {
    let captured: TableResult | null = null
    function Harness() {
      captured = useBusinessGridTable({
        moduleKey: CONFIG.key,
        config: CONFIG,
        records: RECORDS,
        canUpdateRecord: true,
        selectedRowKeys,
        setSelectedRowKeys: keysSpy as unknown as Dispatch<
          SetStateAction<string[]>
        >,
        setSelectedRowMap: mapSpy as unknown as (
          updater: (
            prev: Record<string, ModuleRecord>,
          ) => Record<string, ModuleRecord>,
        ) => void,
        buildActions: (record) =>
          [
            {
              key: 'edit',
              label: `编辑${String(record.id)}`,
              onClick: vi.fn(),
            },
          ] satisfies ActionItem[],
      })
      return null
    }
    act(() => {
      root.render(createElement(Harness))
    })
    return captured as unknown as TableResult
  }

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
})
