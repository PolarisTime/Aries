import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ColumnHeaderMenu } from '@/components/ColumnHeaderMenu'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import {
  buildRowContextMenus,
  type RowContextMenuMap,
} from '@/components/row-context-menu'
import type { ActionItem } from '@/components/TableActions'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import {
  DETAIL_TOGGLE_COLUMN_ID,
  type DetailToggleVariant,
  useGridColumns,
} from '@/hooks/useGridColumns'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import {
  mergeColumnOrder,
  moveColumnKey,
  toggleColumnVisibility,
} from '@/utils/table-columns'
import {
  buildSelectionA11yProps,
  describeSelectionRow,
} from '@/utils/table-selection-a11y'
import { asString } from '@/utils/type-narrowing'

interface Props {
  moduleKey: ModuleKey
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  selectedRowKeys: string[]
  setSelectedRowKeys: Dispatch<SetStateAction<string[]>>
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
  buildActions: (record: ModuleRecord) => ActionItem[]
  onOpenDetail?: (record: ModuleRecord) => void
  /** 内联展开的行 key；提供时明细按钮渲染加号/减号并体现展开态。 */
  expandedRowKeys?: string[]
  detailVariant?: DetailToggleVariant
}

function buildAntdColumns({
  columnDefs,
  columnOrder,
  columnVisibility,
  visibleDataColumnIds,
  onHideColumn,
  onMoveColumn,
}: {
  columnDefs: ColumnDef<StockFeatures, ModuleRecord>[]
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
  /** 可见业务数据列: 「移到最前/最后」的边界与插入点都基于它 */
  visibleDataColumnIds: string[]
  onHideColumn: (columnId: string) => void
  onMoveColumn: (columnId: string, position: 'first' | 'last') => void
}): TableColumnsType<ModuleRecord> {
  const columnMap = new Map(
    columnDefs.map((column) => [
      (column as ColumnDef<StockFeatures, ModuleRecord> & { id: string }).id,
      column,
    ]),
  )
  return columnOrder.flatMap((columnId) => {
    if (columnVisibility[columnId] === false) {
      return []
    }
    const columnDef = columnMap.get(columnId)
    if (!columnDef) {
      return []
    }
    const rawTitle: ReactNode =
      typeof columnDef.header === 'function' ? '' : columnDef.header
    /*
     * 列头挂右键菜单: 隐藏该列 / 移到最前 / 移到最后 / 列设置…
     * 明细按钮列(空标题)不参与(隐藏或移动它没有意义)。
     */
    const title =
      rawTitle === '' ? (
        rawTitle
      ) : (
        <ColumnHeaderMenu
          key={columnId}
          columnTitle={typeof rawTitle === 'string' ? rawTitle : columnId}
          isFirst={visibleDataColumnIds[0] === columnId}
          isLast={visibleDataColumnIds.at(-1) === columnId}
          onHide={() => onHideColumn(columnId)}
          onMoveFirst={() => onMoveColumn(columnId, 'first')}
          onMoveLast={() => onMoveColumn(columnId, 'last')}
        >
          <span className="module-table-column-title">{rawTitle}</span>
        </ColumnHeaderMenu>
      )
    return [
      {
        title,
        dataIndex: columnId,
        key: columnId,
        fixed: columnDef.meta?.fixed as ColumnType<ModuleRecord>['fixed'],
        width: columnDef.meta?.width,
        align: 'center',
        ellipsis: true,
        render: (_: unknown, record: ModuleRecord) => {
          return columnDef.meta?.renderCell?.(record) ?? null
        },
      },
    ]
  })
}

export function useBusinessGridTable({
  moduleKey,
  config,
  records,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedRowMap,
  buildActions,
  onOpenDetail,
  expandedRowKeys,
  detailVariant,
}: Props) {
  const { t } = useTranslation()
  const totalColumnCount = config?.columns?.length ?? 0
  const {
    columnOrder: savedOrder,
    columnVisibility,
    columnSizes,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport(
    moduleKey,
    config?.defaultHiddenColumnKeys,
    totalColumnCount,
  )
  const fallbackConfig: ModulePageConfig = {
    key: moduleKey,
    title: '',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
  }
  const { columns: columnDefs } = useGridColumns({
    config: config ?? fallbackConfig,
    onOpenDetail: config ? onOpenDetail : undefined,
    expandedRowKeys,
    variant: detailVariant,
  })
  const allColumnIds = useMemo(
    () =>
      columnDefs.map(
        (c) =>
          (c as ColumnDef<StockFeatures, ModuleRecord> & { id: string }).id ||
          '',
      ),
    [columnDefs],
  )
  /*
   * filterInvalid: 历史版本里业务列表有行尾「操作列」(id=actions), 列顺序可能把它
   * 持久化在本地; 不过滤掉会让它一直参与"移到最前/最后"的边界判断。
   */
  const columnOrder = useMemo(
    () =>
      mergeColumnOrder(allColumnIds, savedOrder, {
        headId: DETAIL_TOGGLE_COLUMN_ID,
        filterInvalid: true,
      }),
    [allColumnIds, savedOrder],
  )
  /** 业务数据列(剔除固定在首位的明细按钮列)。 */
  const dataColumnIds = useMemo(
    () => columnOrder.filter((id) => id !== DETAIL_TOGGLE_COLUMN_ID),
    [columnOrder],
  )
  /**
   * 可见数据列: 边界判断与移序插入点都必须基于它。
   * 完整顺序里夹着隐藏列(如默认隐藏的备注列), 否则"移到最后"会挪到隐藏列后面 ——
   * 可见顺序没变但新顺序已持久化, 用户以为点了没反应。
   */
  const visibleDataColumnIds = useMemo(
    () => dataColumnIds.filter((id) => columnVisibility[id] !== false),
    [dataColumnIds, columnVisibility],
  )
  /*
   * useColumnSettingsSupport 暴露的 handler 每次渲染都是新函数, 直接进 useMemo 依赖
   * 会让列构建每次都重建; 这里用 ref 读取最新实现, 只让真正影响结果的 state 参与依赖。
   */
  const columnHandlersRef = useRef({
    handleColumnVisibilityChange,
    handleColumnOrderChange,
  })
  useEffect(() => {
    columnHandlersRef.current = {
      handleColumnVisibilityChange,
      handleColumnOrderChange,
    }
  })
  const handleHideColumn = useCallback(
    (columnId: string) => {
      columnHandlersRef.current.handleColumnVisibilityChange(
        toggleColumnVisibility(columnVisibility, columnId),
      )
      // 隐藏后列头连同右键入口一起消失, 必须给出可感知反馈并说明恢复位置
      message.success(
        t('common.columnMenu.hidden', {
          column:
            config?.columns?.find((column) => column.dataIndex === columnId)
              ?.title ?? columnId,
        }),
      )
    },
    [columnVisibility, config, t],
  )
  const handleMoveColumn = useCallback(
    (columnId: string, position: 'first' | 'last') => {
      columnHandlersRef.current.handleColumnOrderChange(
        moveColumnKey(dataColumnIds, columnId, position),
      )
    },
    [dataColumnIds],
  )
  const computedColumns = useMemo(
    () =>
      buildAntdColumns({
        columnDefs,
        columnOrder,
        columnVisibility,
        visibleDataColumnIds,
        onHideColumn: handleHideColumn,
        onMoveColumn: handleMoveColumn,
      }),
    [
      columnDefs,
      columnOrder,
      columnVisibility,
      visibleDataColumnIds,
      handleHideColumn,
      handleMoveColumn,
    ],
  )
  // 所有业务列都参与拖拽(行尾操作列已移除, 不再有固定宽度的例外)
  const { columns: resizableColumns, components } =
    useColumnResizing<ModuleRecord>({
      columns: computedColumns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
    })
  const antdColumns = resizableColumns
  /*
   * 最新选中集的 ref: 行菜单打开回调需要"当前"选中行决定是否保留多选,
   * 但选中集本身不能作为 rowContextMenus 的依赖 —— 否则每次勾选都会按
   * O(行数 × 动作数) 重建整表菜单。这里只在打开菜单时读取最新值。
   */
  const selectedRowKeysRef = useRef(selectedRowKeys)
  useEffect(() => {
    selectedRowKeysRef.current = selectedRowKeys
  }, [selectedRowKeys])
  /**
   * 行右键菜单(鼠标右键 / 键盘 Shift+F10 / 触摸长按共用同一份菜单):
   * 行级动作只由 `useModuleRecordActions` 产出的 `ActionItem[]` 提供,
   * 因此菜单项的文案、禁用口径、二次确认只有一处定义。
   */
  const rowContextMenus = useMemo<RowContextMenuMap>(() => {
    const primaryNoKey = config?.primaryNoKey
    return buildRowContextMenus({
      records,
      buildActions,
      labelOf: (record) =>
        (primaryNoKey ? asString(record[primaryNoKey]) : '') ||
        String(record.id),
      ariaLabelOf: (label) =>
        t('modules.table.rowContextMenuLabel', { title: label }),
      okText: t('common.ok'),
      cancelText: t('common.cancel'),
      /*
       * 打开某行菜单即把选中态切到该行: 行菜单里的动作(删除/编辑)作用在
       * 「菜单所属行」, 若选中集还停留在别的行, 工具栏与菜单的对象就会打架(删错行)。
       * 该行已在选中集内时保持原有多选, 不打断批量操作。
       */
      onMenuOpen: (record) => {
        const key = String(record.id)
        if (selectedRowKeysRef.current.includes(key)) return
        const normalizedKeysSet = new Set([key])
        setSelectedRowKeys([key])
        setSelectedRowMap((prev) => {
          const next = { ...prev }
          for (const existing of Object.keys(next)) {
            if (!normalizedKeysSet.has(existing)) {
              delete next[existing]
            }
          }
          next[key] = record
          return next
        })
      },
      requestConfirm: ({ title, okText, cancelText, danger, onOk }) =>
        modal.confirm({
          title,
          okText,
          cancelText,
          ...(danger ? { okButtonProps: { danger: true } } : {}),
          onOk,
        }),
    })
  }, [
    buildActions,
    config?.primaryNoKey,
    records,
    setSelectedRowKeys,
    setSelectedRowMap,
    t,
  ])

  /** 行容器换成支持右键菜单的包装(保留列宽拖拽注入的其它 components)。 */
  const tableComponents = useMemo(() => {
    if (!rowContextMenus.size) return components
    return {
      ...components,
      body: { ...components?.body, row: RowContextMenuRow },
    }
  }, [components, rowContextMenus])
  const rowSelection: TableProps<ModuleRecord>['rowSelection'] | undefined = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: ModuleRecord[]) => {
      const normalizedKeys = keys.map(String)
      const normalizedKeysSet = new Set(normalizedKeys)
      setSelectedRowKeys(normalizedKeys)
      setSelectedRowMap((prev) => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          if (!normalizedKeysSet.has(key)) {
            delete next[key]
          }
        }
        for (const row of rows) {
          next[String(row.id)] = row
        }
        return next
      })
    },
    preserveSelectedRowKeys: true,
    /*
     * antd 默认的 Select all / Select row N 是硬编码英文, 覆盖成本项目 i18n 文案;
     * 行名优先用模块主单号(config.primaryNoKey), 读屏用户才能分辨勾的是哪一单。
     */
    ...buildSelectionA11yProps<ModuleRecord>(
      t,
      (record) =>
        (config?.primaryNoKey ? asString(record[config.primaryNoKey]) : '') ||
        describeSelectionRow(record),
    ),
  }
  useEffect(() => {
    if (!selectedRowKeys.length || !records.length) return

    const selectedKeys = new Set(selectedRowKeys)
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- 当前页刷新后必须替换父级持有的跨页选择快照。
    setSelectedRowMap((previous) => {
      let changed = false
      const next = { ...previous }
      for (const record of records) {
        const key = String(record.id)
        if (!selectedKeys.has(key) || next[key] === record) continue
        next[key] = record
        changed = true
      }
      return changed ? next : previous
    })
  }, [records, selectedRowKeys, setSelectedRowMap])
  const columnVisibleKeys = columnOrder.filter(
    (id) => columnVisibility[id] !== false,
  )
  const toggleColumn = (key: string) => {
    handleColumnVisibilityChange(toggleColumnVisibility(columnVisibility, key))
  }
  return {
    antdColumns,
    components: tableComponents,
    rowContextMenus,
    columnOrder,
    columnVisibleKeys,
    toggleColumn,
    rowSelection,
    onColumnOrderChange: handleColumnOrderChange,
    handleColumnResizeReset,
  }
}
