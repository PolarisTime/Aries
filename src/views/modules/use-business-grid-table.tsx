import { MoreOutlined } from '@ant-design/icons'
import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
import { Button } from 'antd'
import i18next from 'i18next'
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
import { ContextMenu } from '@/components/ContextMenu'
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
import { message } from '@/utils/antd-app'
import { confirmDanger } from '@/utils/confirm-danger'
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

/** 行尾「更多操作」列的列 key(不参与「列设置」, 也不进列顺序持久化)。 */
export const MORE_ACTIONS_COLUMN_ID = '__row-more-actions'
/**
 * 行尾「更多操作」列宽: 24px 图标 + 单元格左右各 8px 内边距 = 40px。
 *
 * <p>取 40 而不是与明细列同宽的 48: 40 本身是 8 的倍数(满足间距规范),
 * 又是"24px 命中区 + 两侧 8px"的**实际最小需求**, 不为了对称多占 8px 横向预算 ——
 * 业务网格本来就有 11 个页面横向溢出, 这 8px 是白拿的。</p>
 */
export const MORE_ACTIONS_COLUMN_WIDTH = 40

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
    /*
     * 明细展开列的 header 是空串(按钮图标自带 aria-label), 但空 title 会让 antd 渲出
     * 一个无文本、无 aria-label 的 `<th>`, axe 报 empty-table-header, 读屏在表头行里
     * 遇到空单元格无法判断用途。这里把"空标题"换成只对读屏可见的列名, 视觉仍为空。
     * key 属于 `modules.table`(不是 `common.table`), 写错命名空间会渲染出原始 key。
     */
    const title =
      rawTitle === '' ? (
        <span key={columnId} className="aries-sr-only">
          {i18next.t('modules.table.expandDetailColumn')}
        </span>
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
        fixed: columnDef.meta?.fixed,
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

/**
 * 把「每次渲染都是新实例」的回调收敛成稳定引用。
 * ref 的读写全部留在组件外: 组件渲染期不再直接访问 ref.current, 否则 React Compiler
 * 会判定 refs 违规(连「把读 ref 的函数传给别的函数」也会命中)并放弃对这个列表的优化。
 */
function useLatestCallback<T extends (...args: never[]) => void>(
  callback: T,
): T {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })
  return useCallback((...args: Parameters<T>) => {
    callbackRef.current(...args)
  }, []) as T
}

/** 读取最新值的稳定访问器: 让事件回调读到「当前」状态, 又不让该状态成为 memo 依赖。 */
function useLatestValueGetter<T>(value: T): () => T {
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])
  return useCallback(() => valueRef.current, [])
}

/**
 * 行菜单打开时的选中集变更 —— **唯一来源**(右键 / 触摸长按 / Shift+F10 / 行尾
 * 「更多操作」按钮四条入口共用, 见 `onMenuOpen`)。
 *
 * <p>规则(两分支都必须被测试锁定):</p>
 * <ol>
 *   <li><b>菜单所属行已在选中集内</b>: **保持原有多选**。用户勾了 2 行再右键其中一行
 *     查看菜单, 批量目标不能被缩成 1 行(实测缺陷: 「导出选中 2 条」变「导出选中 1 条」,
 *     且没有任何提示)。</li>
 *   <li><b>行不在选中集内</b>: 把选中集**切换为该行**。行菜单里的动作(删除/编辑)
 *     作用在「菜单所属行」, 若选中集还停在别的行, 工具栏与菜单的对象就会打架(删错行)。
 *     这里刻意不做"保留多选 + 文字说明": 右键一个没勾的行却对别的行执行操作,
 *     比缩小选中集更危险。</li>
 * </ol>
 */
export function resolveRowMenuSelection({
  record,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedRowMap,
}: {
  record: ModuleRecord
  selectedRowKeys: string[]
  setSelectedRowKeys: Dispatch<SetStateAction<string[]>>
  setSelectedRowMap: (
    updater: (
      prev: Record<string, ModuleRecord>,
    ) => Record<string, ModuleRecord>,
  ) => void
}) {
  const key = String(record.id)
  // 分支 1: 已在选中集内 —— 保持多选, 不打断批量操作
  if (selectedRowKeys.includes(key)) return
  // 分支 2: 不在选中集内 —— 选中集切换为这一行
  setSelectedRowKeys([key])
  setSelectedRowMap(() => ({ [key]: record }))
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
   * 会让列构建每次都重建; 这里用「最新回调」包装成稳定引用, 只让真正影响结果的 state
   * 参与依赖(包装函数本身恒定, 不会引入多余依赖)。
   */
  const applyColumnVisibilityChange = useLatestCallback(
    handleColumnVisibilityChange,
  )
  const applyColumnOrderChange = useLatestCallback(handleColumnOrderChange)
  const handleHideColumn = useCallback(
    (columnId: string) => {
      applyColumnVisibilityChange(
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
    [applyColumnVisibilityChange, columnVisibility, config, t],
  )
  const handleMoveColumn = useCallback(
    (columnId: string, position: 'first' | 'last') => {
      applyColumnOrderChange(moveColumnKey(dataColumnIds, columnId, position))
    },
    [applyColumnOrderChange, dataColumnIds],
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
  /*
   * 行菜单打开回调需要"当前"选中行决定是否保留多选, 但选中集本身不能作为
   * rowContextMenus 的依赖 —— 否则每次勾选都会按 O(行数 × 动作数) 重建整表菜单。
   * 用稳定访问器在打开菜单时读取最新值, 依赖保持不变。
   */
  const getSelectedRowKeys = useLatestValueGetter(selectedRowKeys)
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
       * 打开某行菜单(右键 / 长按 / Shift+F10 / 行尾「更多操作」按钮)即同步操作目标,
       * 规则收敛在 resolveRowMenuSelection 一处, 四条入口不再各写一份。
       */
      onMenuOpen: (record) =>
        resolveRowMenuSelection({
          record,
          selectedRowKeys: getSelectedRowKeys(),
          setSelectedRowKeys,
          setSelectedRowMap,
        }),
      /*
       * 行级危险动作（删除等）的二次确认：统一走 confirmDanger，
       * 保证默认焦点落在「取消」侧（antd 默认聚焦确认按钮，回车即执行）。
       */
      requestConfirm: ({ title, okText, cancelText, danger, onOk }) =>
        confirmDanger({
          title,
          okText,
          cancelText,
          danger,
          onOk,
        }),
    })
  }, [
    buildActions,
    config?.primaryNoKey,
    getSelectedRowKeys,
    records,
    setSelectedRowKeys,
    setSelectedRowMap,
    t,
  ])

  /*
   * 行尾「更多操作」列: 把行菜单**同一份**配置(`rowContextMenus`)挂成可见按钮。
   *
   * <p>为什么必须有: 触屏没有右键, 长按既不可发现又只能服务一个动作; 只看得到
   * 「展开明细」的行, 编辑/审核/附件在触屏上等于不存在(WCAG 2.2 SC 2.1.1)。
   * 菜单不另建一份 —— 按钮与右键/长按/Shift+F10 共用 `buildRowContextMenus`
   * 的同一份 items/onClick/ariaLabel, 因此不会出现"按钮能点、右键点不动"的漂移。</p>
   *
   * <p>固定右侧且不参与列宽拖拽: 横向滚动时行操作入口始终可用; 它也不进「列设置」,
   * 避免变成一个可隐藏的伪业务列。</p>
   */
  const moreActionsColumn = useMemo<
    TableColumnsType<ModuleRecord>[number]
  >(() => {
    return {
      key: MORE_ACTIONS_COLUMN_ID,
      title: t('modules.table.moreActionsColumn'),
      width: MORE_ACTIONS_COLUMN_WIDTH,
      fixed: 'right',
      align: 'center',
      render: (_value: unknown, record: ModuleRecord) => {
        const menu = rowContextMenus.get(String(record.id))
        if (!menu) return null
        return (
          <ContextMenu
            ariaLabel={menu.ariaLabel}
            items={menu.items}
            onClick={menu.onClick}
            onOpenChange={(next) => {
              if (next) menu.onOpen?.()
            }}
            // 可见按钮与右键共用同一份菜单与其无障碍契约(焦点进首项 / Escape 归还焦点)
            triggers={['click', 'contextMenu']}
          >
            <Button
              aria-haspopup="menu"
              aria-label={menu.ariaLabel}
              className="module-row-more-actions"
              icon={<MoreOutlined />}
              size="small"
              type="text"
            />
          </ContextMenu>
        )
      },
    }
  }, [rowContextMenus, t])
  const antdColumns = useMemo(
    () => [...resizableColumns, moreActionsColumn],
    [moreActionsColumn, resizableColumns],
  )

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
     * 勾选列固定左侧 + 表头文案, 都走 antd 的 rowSelection 官方 API。
     *
     * <p>**不能**在 columns 里展开 `Table.SELECTION_COLUMN` 来加这两个属性 —— 它是
     * antd 的哨兵对象(`{}`), useSelection 用 `cloneColumns.includes(SELECTION_COLUMN)`
     * 靠**对象身份**识别。展开成新对象后身份判断失效, antd 会再插入一列真实勾选列,
     * 于是多出一个 0 宽幽灵表头(实测: class 带 fix-start、width=0、文本是"全选当前页
     * 所有行", 还把左侧固定块的偏移撑乱)。</p>
     */
    fixed: 'start',
    columnTitle: t('common.table.selectAllRows'),
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
