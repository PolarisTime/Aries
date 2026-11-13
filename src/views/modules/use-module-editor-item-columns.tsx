import { CopyOutlined, HolderOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType, TableProps } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchMaterialSearch } from '@/api/master/materials'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import { buildRowContextMenus } from '@/components/row-context-menu'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { useHasPermission } from '@/hooks/usePermission'
import { isEditorItemColumnEditableForModule } from '@/module-system/adapter/module-adapter-editor'
import { hasSourceParentItemId } from '@/module-system/adapter/module-adapter-parent-import'
import {
  buildModuleEditorDataColumns,
  dropEmptyItemColumns,
} from '@/module-system/editor/module-editor-item-column-builders'
import { useModuleEditorItemColumnHandlers } from '@/module-system/editor/module-editor-item-column-handlers'
import { duplicateEditorLineItem } from '@/module-system/editor/module-editor-line-item-duplicate'
import { applyMaterialToEditorLineItem } from '@/module-system/editor/module-editor-line-item-utils'
import {
  buildMaterialSelectOptions,
  MATERIAL_SEARCH_DEBOUNCE_MS,
  mergeMaterialRecords,
} from '@/module-system/editor/module-editor-material-options'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import { useAuthStore } from '@/stores/authStore'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { mergeColumnOrder, toggleColumnVisibility } from '@/utils/table-columns'
import { asString } from '@/utils/type-narrowing'
import { getModuleEditorItemBehavior } from '@/views/modules/module-editor-item-behaviors'
import { usePurchaseOrderWarehouseRecommendations } from '@/views/modules/use-purchase-order-warehouse-recommendations'
import { IDENTITY_COLUMN_WIDTH } from './components/BusinessGridTable'
import { focusFirstEditableItemCell } from './components/module-editor-item-focus'
import {
  RowIdentityCell,
  RowIdentityHeader,
} from './components/RowIdentityCell'

interface Props {
  moduleKey: string
  supplierId?: unknown
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  canManageItems: boolean
  lineItemsLocked: boolean
  /** 是否在身份列右侧渲染行序拖动柄（行序可调时）。 */
  showDragHandle: boolean
  canEditItemColumns: boolean
  parentImportedItemEditLocked: boolean
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
}

type MaterialLookupEntry = readonly [string, ModuleRecord]

export function useModuleEditorItemColumns({
  moduleKey,
  supplierId,
  config,
  items,
  setItems,
  canManageItems,
  lineItemsLocked,
  showDragHandle,
  canEditItemColumns,
  parentImportedItemEditLocked,
  selectedItemIds,
  onSelectAll,
  onSelectItem,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const { t } = useTranslation()
  const { warehouses, materials } = useMasterOptions({
    warehouses: true,
    materials: true,
    /*
     * 必须显式声明 materialCategories：编辑器的明细派生/校验/只读判定会调用
     * `isPurchaseWeighRequiredCategory()`，它读的是材料类别主数据里的
     * `purchase_weigh_required` 开关。此前全站没有任何页面声明这项需求，
     * 于是这些判定一直走 module-option-resolvers 里的硬编码兜底词表——
     * 在「材料类别」页把某类别改成「需过磅」后，单据侧不会生效。
     */
    materialCategories: true,
  })
  const token = useAuthStore((s) => s.token)
  const canEditSalesUnitPrice = useHasPermission(
    'sales-orders:update:unit-price',
  )
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('')
  const [debouncedMaterialSearchKeyword, setDebouncedMaterialSearchKeyword] =
    useState('')
  /** 刚复制出的新行 id：渲染完成后把焦点落到该行首格。 */
  const [pendingFocusItemId, setPendingFocusItemId] = useState<string | null>(
    null,
  )
  const totalItemColumnCount = config.itemColumns?.length ?? 0
  const defaultHiddenItemColumnKeys = config?.itemColumnConfig?.hiddenByDefault
  const {
    columnOrder: savedItemColumnOrder,
    columnVisibility,
    columnSizes,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
    handleColumnResizePreview,
    handleColumnResizeCommit,
    handleColumnResizeReset,
  } = useColumnSettingsSupport(
    `${config?.key ?? moduleKey}:editor-items`,
    defaultHiddenItemColumnKeys,
    totalItemColumnCount,
    /*
     * 当前明细列 key（`dataIndex`）：用于识别「保存的列顺序引用了已不存在的列」。
     * 物流单等模块调整过 include 后，旧顺序会把仍在的列顶到前面，看起来就是顺序乱了。
     */
    config.itemColumns?.map((column) => String(column.dataIndex ?? '')),
  )
  const {
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  } = useModuleEditorItemColumnHandlers({ moduleKey, setItems })
  usePurchaseOrderWarehouseRecommendations({
    enabled:
      Boolean(
        getModuleEditorItemBehavior(moduleKey)?.enablesWarehouseRecommendations,
      ) &&
      canEditItemColumns &&
      !lineItemsLocked,
    supplierId,
    items,
    setItems,
  })

  const isItemColumnEditable = (columnKey: string, record?: ModuleLineItem) => {
    // 字段级写权限：无 sales-orders:update:unit-price 时销售单价只读（后端另有拒改校验）。
    if (
      moduleKey === 'sales-order' &&
      columnKey === 'unitPrice' &&
      !canEditSalesUnitPrice
    ) {
      return false
    }
    return isEditorItemColumnEditableForModule(
      moduleKey,
      columnKey,
      canEditItemColumns,
      lineItemsLocked,
      record,
      parentImportedItemEditLocked,
    )
  }

  // 清空关键词时立即复位防抖值: 复位放在输入事件里而不是 effect 体内同步 setState,
  // 既保持"清空即回到全量候选"的既有语义, 又避免级联渲染。
  const handleMaterialSearchKeywordChange = (keyword: string) => {
    setMaterialSearchKeyword(keyword)
    if (!keyword.trim()) setDebouncedMaterialSearchKeyword('')
  }

  useEffect(() => {
    const keyword = materialSearchKeyword.trim()
    if (!keyword) return undefined
    const timer = window.setTimeout(
      () => setDebouncedMaterialSearchKeyword(keyword),
      MATERIAL_SEARCH_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [materialSearchKeyword])

  const { data: materialSearchPage, isFetching: isMaterialSearchFetching } =
    useQuery({
      queryKey: QUERY_KEYS.masterOptions.materialSearch(
        debouncedMaterialSearchKeyword,
      ),
      queryFn: ({ signal }) =>
        fetchMaterialSearch(
          debouncedMaterialSearchKeyword,
          200,
          undefined,
          signal,
        ),
      enabled: Boolean(token) && debouncedMaterialSearchKeyword.length > 0,
      staleTime: STALE_MASTER_OPTIONS,
      placeholderData: keepPreviousData,
    })

  // 本地只预加载首页 200 条商品，输入关键词时用服务端搜索结果补全，
  // 再按主键合并去重，让本地结构化/拼音过滤继续对全量候选生效。
  const materialRecords = useMemo(() => {
    const searchResults = debouncedMaterialSearchKeyword
      ? (materialSearchPage?.content ?? [])
      : []
    return mergeMaterialRecords(searchResults, materials)
  }, [debouncedMaterialSearchKeyword, materialSearchPage, materials])

  const materialLookup = useMemo(() => {
    const entries = materialRecords.flatMap((record): MaterialLookupEntry[] => {
      const materialId = asString(record.id).trim()
      return materialId ? [[materialId, record]] : []
    })

    return new Map(entries)
  }, [materialRecords])

  const materialOptions = useMemo(
    () => buildMaterialSelectOptions(materialRecords),
    [materialRecords],
  )

  const materialSearch: MaterialSearchController = {
    searching: isMaterialSearchFetching,
    onSearch: handleMaterialSearchKeywordChange,
    onClose: () => {
      setMaterialSearchKeyword('')
      setDebouncedMaterialSearchKeyword('')
    },
  }
  const allItemColumnIds = (config.itemColumns || []).map(
    (column) => column.dataIndex,
  )
  const itemColumnOrder = mergeColumnOrder(
    allItemColumnIds,
    savedItemColumnOrder,
    {
      filterInvalid: true,
    },
  )
  const visibleItemColumnKeys = itemColumnOrder.filter(
    (key) => columnVisibility[key] !== false,
  )
  const orderedVisibleItemColumns = (() => {
    const columnMap = new Map<string, ModuleColumnDefinition>(
      (config.itemColumns || []).map((column) => [column.dataIndex, column]),
    )

    return visibleItemColumnKeys.map(
      (key) => columnMap.get(key) as ModuleColumnDefinition,
    )
  })()

  const handleResolvedMaterialSelect = (itemId: string, materialId: string) => {
    const normalizedId = materialId.trim()
    const materialRecord =
      normalizedId.length > 0 ? materialLookup.get(normalizedId) || null : null

    handleMaterialSelect(itemId, normalizedId, materialRecord, (item, record) =>
      applyMaterialToEditorLineItem(item, record, moduleKey),
    )
  }

  /** 行标识：优先商品名称/编码，用于行右键菜单可访问名与按钮 aria-label。 */
  const resolveItemRowLabel = useCallback(
    (item: ModuleLineItem) =>
      asString(item.materialName).trim() ||
      asString(item.materialCode).trim() ||
      asString(item.material).trim() ||
      String(item.id),
    [],
  )

  // 复制本行：只读、明细锁定、上游导入锁定或保存中时不可用
  const canDuplicateItem =
    canManageItems &&
    canEditItemColumns &&
    !lineItemsLocked &&
    !parentImportedItemEditLocked

  const handleDuplicateItem = useCallback(
    (itemId: string) => {
      const duplicated = duplicateEditorLineItem(items, itemId)
      if (!duplicated) return
      setItems(duplicated.items)
      // 焦点落到新行首格须等表格渲染出新行，这里先记下 id
      setPendingFocusItemId(duplicated.newItemId)
    },
    [items, setItems],
  )

  useEffect(() => {
    if (!pendingFocusItemId) return undefined
    // 落焦点是 DOM 副作用：放到 rAF 回调里执行，既保证新行已渲染，
    // 又不把"清标记"的 setState 放在 effect 体内（同步 setState 会触发级联渲染，
    // React Compiler 也会因此跳过本组件的自动记忆化）。
    const frame = window.requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(
        `.module-items-table-shell tr[data-row-key="${pendingFocusItemId}"]`,
      )
      focusFirstEditableItemCell(row)
      setPendingFocusItemId(null)
    })
    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [pendingFocusItemId])

  const duplicateItemLabel = t('modules.itemsSection.duplicateItem')
  /*
   * 「复制本行」只保留行右键菜单一个入口（表格里的「操作」列已移除）：
   * 导入行不可复制 —— 来源明细（`source*ItemId`）和数量上限挂在同一来源行上，
   * 复制出的副本与原行引用同一来源，两行各自 ≤ 上限、合计超量，保存时才被后端拒绝。
   */
  const itemRowMenus = useMemo<RowContextMenuMap>(() => {
    if (!canDuplicateItem) return new Map()
    return buildRowContextMenus({
      records: items,
      buildActions: (item) => [
        {
          key: 'duplicate',
          label: duplicateItemLabel,
          icon: <CopyOutlined />,
          // 导入行在菜单里同样置灰（菜单没有悬停提示，原因写在按钮 title 上）
          disabled: hasSourceParentItemId(item),
          onClick: () => handleDuplicateItem(item.id),
        },
      ],
      labelOf: resolveItemRowLabel,
      ariaLabelOf: (label) =>
        t('modules.table.rowContextMenuLabel', { title: label }),
      okText: t('common.ok'),
      cancelText: t('common.cancel'),
      // 明细行动作没有二次确认，占位回调不会被执行
      requestConfirm: () => undefined,
    })
  }, [
    canDuplicateItem,
    duplicateItemLabel,
    handleDuplicateItem,
    items,
    resolveItemRowLabel,
    t,
  ])

  /**
   * 行选择：交给 antd 的 `rowSelection`，与列表页**同一套「身份列」**。
   *
   * <p>此前是两列（勾选框 48px + 序号 56px），两个列位各装一个 16~24px 的小元素，
   * 横向一片竖线读起来散；列表页早已合并成一列「序号⇄勾选」，这里复用同一份
   * `RowIdentityCell` / `RowIdentityHeader`，两处观感与交互一致。</p>
   *
   * <p>全选/半选、Shift 连选与「选择此行：…」的可访问名都由 antd 提供（`renderCell` 的
   * `originNode`），自己画复选框就得把这套语义整抄一遍。</p>
   *
   * <p>**行序拖动柄也在这一列**（动作槽，列表页那一格放的是"明细加号"）：拖动柄只是一个
   * 视觉线索，真正的激活点是整行长按（见 `RowDragSortScope`），所以它不需要自己的列位 ——
   * 单开一列 44px 只为一个图标，横向浪费且多一条竖线。</p>
   */
  const itemRowSelection = useMemo<
    TableProps<ModuleLineItem>['rowSelection']
  >(() => {
    if (!canManageItems) return undefined
    const selectedSet = new Set(selectedItemIds)
    return {
      selectedRowKeys: selectedItemIds,
      fixed: 'start',
      columnWidth: IDENTITY_COLUMN_WIDTH,
      onSelect: (record, checked) => onSelectItem(record.id, checked),
      onSelectAll: (checked) => onSelectAll(checked),
      columnTitle: (selectAll: React.ReactNode) => (
        <RowIdentityHeader
          label={t('modules.table.sequence')}
          selectAll={selectAll}
        />
      ),
      renderCell: (_checked, record, index, originNode) => (
        <RowIdentityCell
          sequenceNumber={index + 1}
          checkbox={originNode}
          detailToggle={
            showDragHandle ? (
              <span
                className="module-row-drag-handle"
                aria-hidden="true"
                title={t('common.rowDragSort.moveColumnTitle')}
              >
                <HolderOutlined />
              </span>
            ) : null
          }
          selected={selectedSet.has(record.id)}
        />
      ),
    }
  }, [
    canManageItems,
    onSelectAll,
    onSelectItem,
    selectedItemIds,
    showDragHandle,
    t,
  ])

  const itemColumns: TableColumnsType<ModuleLineItem> = (() => {
    if (!config.itemColumns?.length) return []

    const cols: TableColumnsType<ModuleLineItem> = []

    cols.push(
      ...buildModuleEditorDataColumns({
        config,
        /*
         * 整列无信息的列不进表：销售订单的派生数量列在新建 / 草稿下必然是空值，
         * 4 列各渲染一个「-」只会占宽并让人以为漏填（口径见 dropEmptyItemColumns）。
         */
        itemColumns: dropEmptyItemColumns(orderedVisibleItemColumns, items),
        materialOptions,
        materialSearch,
        warehouses,
        formatCellValue,
        isItemColumnEditable,
        handleItemInputChange,
        handleItemNumberChange,
        handleMaterialSelect: handleResolvedMaterialSelect,
        handleSettlementModeChange,
        handleWarehouseSelect,
      }),
    )

    return cols
  })()

  const toggleItemColumn = (key: string) => {
    handleColumnVisibilityChange(toggleColumnVisibility(columnVisibility, key))
  }

  // 选择/拖拽/序号/行操作列不参与列宽拖拽
  const { columns: resizableItemColumns, components: itemTableComponents } =
    useColumnResizing<ModuleLineItem>({
      columns: itemColumns,
      columnSizes,
      onResizePreview: handleColumnResizePreview,
      onResizeCommit: handleColumnResizeCommit,
      onResizeReset: handleColumnResizeReset,
      isResizable: (column) =>
        column.key !== 'selection' && column.key !== '_index',
    })

  return {
    itemColumns: resizableItemColumns,
    itemRowSelection,
    itemTableComponents,
    itemColumnOrder,
    itemRowMenus,
    onItemColumnOrderChange: handleColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
