import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
import type { ColumnType } from 'antd/es/table'
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
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
  ACTION_COLUMN_WIDTH,
  DETAIL_TOGGLE_COLUMN_ID,
  useGridColumns,
} from '@/hooks/useGridColumns'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { modal } from '@/utils/antd-app'
import {
  mergeColumnOrder,
  moveColumnKey,
  toggleColumnVisibility,
} from '@/utils/table-columns'
import { asString } from '@/utils/type-narrowing'

interface Props {
  moduleKey: ModuleKey
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  canUpdateRecord: boolean
  selectedRowKeys: string[]
  setSelectedRowKeys: Dispatch<SetStateAction<string[]>>
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
  buildActions: (record: ModuleRecord) => ActionItem[]
  showActions?: boolean
  onOpenDetail?: (record: ModuleRecord) => void
}

const ACTIONS_COLUMN_ID = 'actions'

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
     * 明细按钮列(空标题)与操作列不参与(隐藏或移动它们没有意义)。
     */
    const title =
      columnId === ACTIONS_COLUMN_ID || rawTitle === '' ? (
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
        fixed:
          columnId === ACTIONS_COLUMN_ID
            ? undefined
            : (columnDef.meta?.fixed as ColumnType<ModuleRecord>['fixed']),
        className: columnId === 'actions' ? 'sticky-actions-col' : undefined,
        onCell:
          columnId === 'actions'
            ? () => ({ className: 'sticky-actions-col' })
            : undefined,
        onHeaderCell:
          columnId === 'actions'
            ? () => ({ className: 'sticky-actions-col' })
            : undefined,
        width:
          columnId === 'actions' ? ACTION_COLUMN_WIDTH : columnDef.meta?.width,
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
  canUpdateRecord,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedRowMap,
  buildActions,
  showActions,
  onOpenDetail,
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
    rowActions: buildActions,
    canUpdate: Boolean(config) && (canUpdateRecord || Boolean(showActions)),
    showActions: Boolean(config) && showActions,
    onOpenDetail: config ? onOpenDetail : undefined,
  })
  const allColumnIds = columnDefs.map(
    (c) =>
      (c as ColumnDef<StockFeatures, ModuleRecord> & { id: string }).id || '',
  )
  const columnOrder = mergeColumnOrder(allColumnIds, savedOrder, {
    headId: DETAIL_TOGGLE_COLUMN_ID,
    tailId: ACTIONS_COLUMN_ID,
  })
  /** 业务数据列(剔除固定在首尾的明细按钮列与操作列)。 */
  const dataColumnIds = columnOrder.filter(
    (id) => id !== DETAIL_TOGGLE_COLUMN_ID && id !== ACTIONS_COLUMN_ID,
  )
  /**
   * 可见数据列: 边界判断与移序插入点都必须基于它。
   * 完整顺序里夹着隐藏列(如默认隐藏的备注列), 否则"移到最后"会挪到隐藏列后面 ——
   * 可见顺序没变但新顺序已持久化, 用户以为点了没反应。
   */
  const visibleDataColumnIds = dataColumnIds.filter(
    (id) => columnVisibility[id] !== false,
  )
  const computedColumns = buildAntdColumns({
    columnDefs,
    columnOrder,
    columnVisibility,
    visibleDataColumnIds,
    onHideColumn: (columnId) => {
      handleColumnVisibilityChange(
        toggleColumnVisibility(columnVisibility, columnId),
      )
    },
    onMoveColumn: (columnId, position) => {
      handleColumnOrderChange(moveColumnKey(dataColumnIds, columnId, position))
    },
  })
  // 操作列锁定宽度（sticky 固定列），不参与拖拽
  const { columns: resizableColumns, components } =
    useColumnResizing<ModuleRecord>({
      columns: computedColumns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
      isResizable: (column) => column.key !== ACTIONS_COLUMN_ID,
    })
  const antdColumns = resizableColumns
  /**
   * 行右键菜单: 与行内可见按钮(TableActions)共用同一份 ActionItem[],
   * 因此两个入口的文案、禁用口径、二次确认完全一致。
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
      requestConfirm: ({ title, okText, cancelText, danger, onOk }) =>
        modal.confirm({
          title,
          okText,
          cancelText,
          ...(danger ? { okButtonProps: { danger: true } } : {}),
          onOk,
        }),
    })
  }, [buildActions, config?.primaryNoKey, records, t])

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
