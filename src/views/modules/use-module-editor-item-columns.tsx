import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { fetchMaterialSearch } from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { useColumnResizing } from '@/hooks/useColumnResizing'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { isEditorItemColumnEditableForModule } from '@/module-system/adapter/module-adapter-editor'
import {
  buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns,
} from '@/module-system/editor/module-editor-item-column-builders'
import { useModuleEditorItemColumnHandlers } from '@/module-system/editor/module-editor-item-column-handlers'
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
  const { warehouses, materials } = useMasterOptions({
    warehouses: true,
    materials: true,
  })
  const token = useAuthStore((s) => s.token)
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('')
  const [debouncedMaterialSearchKeyword, setDebouncedMaterialSearchKeyword] =
    useState('')
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

  const isItemColumnEditable = (columnKey: string, record?: ModuleLineItem) =>
    isEditorItemColumnEditableForModule(
      moduleKey,
      columnKey,
      canEditItemColumns,
      lineItemsLocked,
      record,
      parentImportedItemEditLocked,
    )

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

  const itemColumns: TableColumnsType<ModuleLineItem> = (() => {
    if (!config.itemColumns?.length) return []

    const cols: TableColumnsType<ModuleLineItem> = []

    if (canManageItems) {
      cols.push(
        ...buildModuleEditorManagementColumns({
          draggable:
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

    return cols
  })()

  const toggleItemColumn = (key: string) => {
    handleColumnVisibilityChange(toggleColumnVisibility(columnVisibility, key))
  }

  // 选择/拖拽/序号列不参与列宽拖拽
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
    itemTableComponents,
    itemColumnOrder,
    onItemColumnOrderChange: handleColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
