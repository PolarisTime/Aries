import type { ColumnDef, StockFeatures } from '@tanstack/react-table'
import type { TableColumnsType, TableProps } from 'antd'
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
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import {
  buildRowContextMenus,
  type RowContextMenuMap,
} from '@/components/row-context-menu'
import type { ActionItem } from '@/components/TableActions'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import {
  type DetailToggleVariant,
  useGridColumns,
} from '@/hooks/useGridColumns'
import { isContextMenuActionHidden } from '@/layouts/context-menu-actions'
import type { ModuleKey } from '@/module-system/core/module-key'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import type {
  ModuleActionDefinition,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
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
  /**
   * 勾选后才可用的批量动作（批量删除 / 批量审核 / 反审核 / 导出选中…）。
   *
   * <p>这些动作原本只出现在「已选择 N 项」横幅里；行右键菜单同样需要它们 ——
   * 用户选完单后习惯直接右键操作目标行，而不是再回到顶部横幅去找按钮。</p>
   */
  batchActions?: ModuleActionDefinition[]
  onBatchAction?: (action: ModuleActionDefinition) => void
  onOpenDetail?: (record: ModuleRecord) => void
  /** 内联展开的行 key；提供时明细按钮渲染加号/减号并体现展开态。 */
  expandedRowKeys?: string[]
  detailVariant?: DetailToggleVariant
}

/*
 * 行尾「更多操作」列已删除：行菜单按钮并入首位身份列（见 BusinessGridTable 的
 * IDENTITY_COLUMN_WIDTH），列宽预算从「序号 64 + 勾选 32 + 明细 48 + 操作 40」收敛为 128。
 */

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
  batchActions,
  onBatchAction,
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
  const { columns: columnDefs, renderRowDetailToggle } = useGridColumns({
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
   * filterInvalid: 历史版本里业务列表有行尾「操作列」(id=actions) 与首位「明细按钮列」
   * (id=detail-toggle), 列顺序可能把它们持久化在本地; 不过滤掉会让它们一直参与
   * "移到最前/最后"的边界判断（那两个列现在都已并入首位身份列，不再是可排序的业务列）。
   */
  const columnOrder = useMemo(
    () => mergeColumnOrder(allColumnIds, savedOrder, { filterInvalid: true }),
    [allColumnIds, savedOrder],
  )
  /**
   * 可见数据列: 边界判断与移序插入点都必须基于它。
   * 完整顺序里夹着隐藏列(如默认隐藏的备注列), 否则"移到最后"会挪到隐藏列后面 ——
   * 可见顺序没变但新顺序已持久化, 用户以为点了没反应。
   * （列集合里已没有"固定首位"的明细按钮列，columnOrder 本身就是业务数据列。）
   */
  const visibleDataColumnIds = useMemo(
    () => columnOrder.filter((id) => columnVisibility[id] !== false),
    [columnOrder, columnVisibility],
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
      applyColumnOrderChange(moveColumnKey(columnOrder, columnId, position))
    },
    [applyColumnOrderChange, columnOrder],
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
  /*
   * 右键菜单分组开关（个人设置 → 右键菜单）。缺省全开，所以这里读到 undefined
   * 与"三项都 true"等价；用布尔默认值收敛一次，避免下面每处都写 `?? true`。
   */
  const hiddenActionKeys = useUiSettingsStore(
    (state) => state.settings?.contextMenu?.hiddenActionKeys,
  )

  /**
   * 批量动作 → 菜单项。key 与行动作共用 handleClick 的同一套分发：
   * `onExtraAction` 先查批量动作表，命中即执行（key 前缀不与行动作冲突）。
   */
  const batchActionsByKey = useMemo(() => {
    // 没 key 的动作进不了菜单（菜单项必须有稳定 key 才能分发点击），先过滤掉
    const entries: Array<[string, ModuleActionDefinition]> = []
    for (const action of batchActions ?? []) {
      if (action.key) {
        entries.push([action.key, action])
      }
    }
    return new Map(entries)
  }, [batchActions])
  /**
   * 行右键菜单(鼠标右键 / 键盘 Shift+F10 / 触摸长按共用同一份菜单):
   * 行级动作只由 `useModuleRecordActions` 产出的 `ActionItem[]` 提供,
   * 因此菜单项的文案、禁用口径、二次确认只有一处定义。
   */
  /*
   * `rowContextMenus` 的依赖里**有意包含 selectedRowKeys**（早先是刻意排除的）。
   *
   * <p>菜单里要不要追加批量动作取决于"哪些行被勾上"，必须随勾选重建；早先为省开销把它
   * 排除、改在菜单打开时现算，实测出现"勾了 2 行、第二次打开菜单仍是旧 items"的问题。
   * 一页 30 行、每行十余个动作，一次 O(行×动作) 重建的代价可以忽略，换来可预测性。
   * 勾选不变时 React 状态里的数组引用不变，因此不会无谓重建。</p>
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
       * 逐项开关（个人设置 → 右键菜单）：只隐藏被显式关掉的动作 key。
       * 过滤后若某行没有任何行动作、但有追加项（批量动作），菜单仍会保留。
       */
      includeAction: (action) =>
        !isContextMenuActionHidden(hiddenActionKeys, action.key),
      /*
       * 勾选多行后，在菜单末尾追加一段批量动作（与横幅里的是同一批动作定义）。
       * 只在"右键的这一行本身就在多选里"时追加：右键未选中的行会把选中态切成该行，
       * 此时批量动作等价于单行动作，追加反而是噪音。
       */
      buildExtraItems: (record) => {
        if (!batchActionsByKey.size) return undefined
        if (selectedRowKeys.length < 2) return undefined
        if (!selectedRowKeys.includes(String(record.id))) return undefined
        /* 逐项开关对批量动作同样生效（例如单独关掉「批量删除」） */
        const children = [...batchActionsByKey.entries()]
          .filter(([key]) => !isContextMenuActionHidden(hiddenActionKeys, key))
          .map(([key, action]) => ({
            key,
            label: action.label,
            danger: action.danger,
            disabled: action.disabled,
          }))
        if (!children.length) return undefined
        return [
          {
            type: 'group' as const,
            label: t('modules.table.rowContextMenuBatchGroup', {
              count: selectedRowKeys.length,
            }),
            children,
          },
        ]
      },
      onExtraAction: (key) => {
        const action = batchActionsByKey.get(key)
        if (!action) return false
        onBatchAction?.(action)
        return true
      },
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
    batchActionsByKey,
    buildActions,
    config?.primaryNoKey,
    getSelectedRowKeys,
    onBatchAction,
    records,
    selectedRowKeys,
    setSelectedRowKeys,
    setSelectedRowMap,
    hiddenActionKeys,
    t,
  ])

  /*
   * 行尾「更多操作」列已并入**首位身份列**（序号 · 勾选 · 明细加号 · 行菜单，同一列）：
   * 一列只放一个 ⋮ 会把它自己变成"孤零零的第四列"，与 40px 的迷你宽度一起制造
   * 「左侧三列 + 右侧一列全是图标」的散乱感。菜单仍只有 `buildRowContextMenus` 一份配置，
   * 右键 / 长按 / Shift+F10 / 可见按钮共用同一份 items 与 aria-label，因此不会出现
   * "按钮能点、右键点不动"的漂移；按钮本体改由 BusinessGridTable 渲染在身份列里。
   */
  const antdColumns = resizableColumns

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
     * 勾选列（= 首位身份列）的固定方向、宽度与表头由 BusinessGridTable 统一注入：
     * 那个位置现在一列同时承载「序号 · 勾选 · 明细加号 · 行菜单」，只有它知道
     * 序号起点与行菜单配置，所以呈现层放在渲染表格的地方，这里只保留选择状态。
     *
     * <p>**不能**在 columns 里展开 `Table.SELECTION_COLUMN` 来加这些属性 —— 它是
     * antd 的哨兵对象(`{}`), useSelection 用 `cloneColumns.includes(SELECTION_COLUMN)`
     * 靠**对象身份**识别。展开成新对象后身份判断失效, antd 会再插入一列真实勾选列,
     * 于是多出一个 0 宽幽灵表头, 还把左侧固定块的偏移撑乱。</p>
     */
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
  /*
   * 当前页数据刷新后, 用新的行对象替换父级跨页选择快照里的旧对象。
   *
   * <p><b>为什么这一处必须留在 effect(三选一都被排除)</b>:</p>
   * <ol>
   *   <li><b>不能在渲染期算</b>: `setSelectedRowMap` 写的是**父组件**（`useBusinessGridData`）
   *     持有的 state。React 只允许在渲染期更新「同一个组件」的 state；
   *     渲染期改别人的 state 会触发 “Cannot update a component while rendering a different
   *     component” 并破坏渲染纯度（React 官方口径明确禁止）。</li>
   *   <li><b>不能事件驱动</b>: 触发条件是「列表查询返回了新的 records」（翻页 / 刷新 / 重新查询），
   *     没有对应的用户事件；把刷新后的最新行对象回填给快照是**数据到达**的副作用，不是点击的结果。</li>
   *   <li><b>不能纯派生</b>: 快照要跨页保留（`preserveSelectedRowKeys`），当前页的 records
   *     只覆盖其中一部分键，必须与既有快照合并 —— 这是跨渲染累积的状态，不属于可推导值。</li>
   * </ol>
   * <p>因此这属于 react.dev 允许保留的「与外部（父级）状态同步」一类 effect。
   * 内部用 `changed` 判等，没有实际变化时返回原引用，避免无谓的父级重渲染。</p>
   */
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
    /** 明细按钮渲染器：首位身份列与（旧的）明细列共用同一套口径，见 useGridColumns。 */
    renderRowDetailToggle,
    onColumnOrderChange: handleColumnOrderChange,
    handleColumnResizeReset,
  }
}
