import { CopyOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
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
import {
  buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns,
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
import { focusFirstEditableItemCell } from './components/module-editor-item-focus'
import {
  buildModuleEditorItemDuplicateColumn,
  EDITOR_ITEM_ACTIONS_COLUMN_KEY,
} from './components/module-editor-item-row-actions'

interface Props {
  moduleKey: string
  supplierId?: unknown
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  canManageItems: boolean
  lineItemsLocked: boolean
  canEditItemColumns: boolean
  parentImportedItemEditLocked: boolean
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
  onDragStart: (itemId: string, event: React.DragEvent) => void
  onDragOver: (itemId: string, event: React.DragEvent) => void
  onDragEnd: () => void
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
  canEditItemColumns,
  parentImportedItemEditLocked,
  selectedItemIds,
  onSelectAll,
  onSelectItem,
  onDragStart,
  onDragOver,
  onDragEnd,
}: Props) {
  const { formatCellValue } = useModuleDisplaySupport()
  const { t } = useTranslation()
  const { warehouses, materials } = useMasterOptions({
    warehouses: true,
    materials: true,
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

  useEffect(() => {
    const keyword = materialSearchKeyword.trim()
    if (!keyword) {
      setDebouncedMaterialSearchKeyword('')
      return
    }
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
    onSearch: (keyword) => setMaterialSearchKeyword(keyword),
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
    if (!pendingFocusItemId) return
    const row = document.querySelector<HTMLElement>(
      `.module-items-table-shell tr[data-row-key="${pendingFocusItemId}"]`,
    )
    focusFirstEditableItemCell(row)
    setPendingFocusItemId(null)
  }, [pendingFocusItemId])

  const duplicateItemLabel = t('modules.itemsSection.duplicateItem')

  /** 行右键菜单：与行内「复制本行」按钮共用同一份动作与可用性口径。 */
  const itemRowMenus = useMemo<RowContextMenuMap>(() => {
    if (!canDuplicateItem) return new Map()
    return buildRowContextMenus({
      records: items,
      buildActions: (item) => [
        {
          key: 'duplicate',
          label: duplicateItemLabel,
          icon: <CopyOutlined />,
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

  const itemColumns: TableColumnsType<ModuleLineItem> = (() => {
    if (!config.itemColumns?.length) return []

    const cols: TableColumnsType<ModuleLineItem> = []

    if (canManageItems) {
      cols.push(
        ...buildModuleEditorManagementColumns({
          // 上游导入后行序随上游（销售订单支持自动排序），只放开「选择 + 删除」，
          // 不放开拖拽排序；未导入时沿用模块行为表的拖拽口径。
          draggable:
            !parentImportedItemEditLocked &&
            !getModuleEditorItemBehavior(moduleKey)?.disablesItemReorder,
          items,
          selectedItemIds,
          onSelectAll,
          onSelectItem,
          onDragStart,
          onDragOver,
          onDragEnd,
        }),
      )
    }

    cols.push(
      ...buildModuleEditorDataColumns({
        config,
        itemColumns: orderedVisibleItemColumns,
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

    if (canManageItems && (canDuplicateItem || !parentImportedItemEditLocked)) {
      cols.push(
        buildModuleEditorItemDuplicateColumn({
          title: t('hooks.gridColumns.actions'),
          actionLabel: duplicateItemLabel,
          ariaLabelOf: (record) =>
            t('modules.itemsSection.duplicateItemAriaLabel', {
              label: resolveItemRowLabel(record),
            }),
          disabled: !canDuplicateItem,
          onDuplicate: handleDuplicateItem,
        }),
      )
    }

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
        column.key !== 'selection' &&
        column.key !== '_index' &&
        column.key !== EDITOR_ITEM_ACTIONS_COLUMN_KEY,
    })

  return {
    itemColumns: resizableItemColumns,
    itemTableComponents,
    itemColumnOrder,
    itemRowMenus,
    onItemColumnOrderChange: handleColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
