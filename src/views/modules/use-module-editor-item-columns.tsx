import type { TableColumnsType } from 'antd'
import { pinyin } from 'pinyin-pro'
import { useCallback, useMemo } from 'react'
import { fetchMaterialSearch } from '@/api/materials'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { isEditorItemColumnEditableForModule } from '@/views/modules/module-adapter-editor'
import {
  buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns,
} from '@/views/modules/module-editor-item-column-builders'
import { useModuleEditorItemColumnHandlers } from '@/views/modules/module-editor-item-column-handlers'
import { applyMaterialToEditorLineItem } from '@/views/modules/module-editor-line-item-utils'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  items: ModuleLineItem[]
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
  canManageItems: boolean
  lineItemsLocked: boolean
  selectedItemIds: string[]
  onSelectAll: (checked: boolean) => void
  onSelectItem: (itemId: string, checked: boolean) => void
  onDragStart: (itemId: string, event: React.DragEvent) => void
  onDragOver: (itemId: string, event: React.DragEvent) => void
  onDragEnd: () => void
}

type MaterialLookupEntry = readonly [string, ModuleRecord]
type MaterialSelectOption = {
  label: string
  searchText: string
  value: string
}

function mergeColumnOrder(allIds: string[], savedOrder: string[]) {
  const validIds = new Set(allIds)
  const merged = savedOrder.filter((id) => validIds.has(id))
  const ordered = new Set(merged)
  for (const id of allIds) {
    if (!ordered.has(id)) {
      merged.push(id)
    }
  }
  return merged
}

export function useModuleEditorItemColumns({
  moduleKey,
  config,
  items,
  setItems,
  canManageItems,
  lineItemsLocked,
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
  const totalItemColumnCount = config.itemColumns?.length ?? 0
  const {
    columnOrder: savedItemColumnOrder,
    columnVisibility,
    handleColumnOrderChange,
    handleColumnVisibilityChange,
  } = useColumnSettingsSupport(
    `${config?.key ?? moduleKey}:editor-items`,
    undefined,
    totalItemColumnCount,
  )
  const {
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  } = useModuleEditorItemColumnHandlers({ setItems })

  const isItemColumnEditable = useCallback(
    (columnKey: string) =>
      isEditorItemColumnEditableForModule(
        moduleKey,
        columnKey,
        canManageItems,
        lineItemsLocked,
      ),
    [canManageItems, lineItemsLocked, moduleKey],
  )

  const materialLookup = useMemo(() => {
    const entries = materials.flatMap((record): MaterialLookupEntry[] => {
      const materialCode = String(record.materialCode || '').trim()
      if (!materialCode) {
        return []
      }
      return [[materialCode.toLowerCase(), record]]
    })

    return new Map(entries)
  }, [materials])

  const materialOptions = useMemo(() => {
    const seen = new Set<string>()

    return materials.flatMap((record): MaterialSelectOption[] => {
      const materialCode = String(record.materialCode || '').trim()
      if (!materialCode) {
        return []
      }

      const normalizedCode = materialCode.toLowerCase()
      if (seen.has(normalizedCode)) {
        return []
      }
      seen.add(normalizedCode)

      const brand = String(record.brand || '').trim()
      const category = String(record.category || '').trim()
      const material = String(record.material || '').trim()
      const spec = String(record.spec || '').trim()
      const length = String(record.length || '').trim()
      const materialName =
        typeof record.materialName === 'string'
          ? record.materialName.trim()
          : ''

      return [
        {
          label: [brand || materialName, category, material, spec, length]
            .filter(Boolean)
            .join(' | '),
          searchText: (() => {
            const pyFields = [brand, materialName, category, material, spec]
              .filter(Boolean)
              .map((s) => pinyin(s, { toneType: 'none', type: 'array' }).map((p) => p[0]).join(''))
            return [brand, materialName, category, material, spec, ...pyFields]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
          })(),
          value: materialCode,
        },
      ]
    })
  }, [materials])
  const allItemColumnIds = useMemo(
    () => (config.itemColumns || []).map((column) => column.dataIndex),
    [config.itemColumns],
  )
  const itemColumnOrder = useMemo(
    () => mergeColumnOrder(allItemColumnIds, savedItemColumnOrder),
    [allItemColumnIds, savedItemColumnOrder],
  )
  const visibleItemColumnKeys = useMemo(
    () => itemColumnOrder.filter((key) => columnVisibility[key] !== false),
    [columnVisibility, itemColumnOrder],
  )
  const orderedVisibleItemColumns = useMemo(() => {
    const columnMap = new Map<string, ModuleColumnDefinition>(
      (config.itemColumns || []).map((column) => [column.dataIndex, column]),
    )

    return visibleItemColumnKeys
      .map((key) => columnMap.get(key))
      .filter(Boolean) as ModuleColumnDefinition[]
  }, [config.itemColumns, visibleItemColumnKeys])

  const handleResolvedMaterialSelect = useCallback(
    (itemId: string, materialCode: string) => {
      const normalizedCode = materialCode.trim().toLowerCase()
      const materialRecord =
        normalizedCode.length > 0
          ? materialLookup.get(normalizedCode) || null
          : null

      handleMaterialSelect(
        itemId,
        materialCode,
        materialRecord,
        (item, record) => applyMaterialToEditorLineItem(item, record, moduleKey),
        async (keyword) => {
          const normalizedKeyword = keyword.trim()
          if (!normalizedKeyword) {
            return null
          }
          const matches = await fetchMaterialSearch(normalizedKeyword, 20)
          const exact = matches.find(
            (record) =>
              String(record.materialCode || '')
                .trim()
                .toLowerCase() === normalizedKeyword.toLowerCase(),
          )
          return exact || null
        },
      )
    },
    [handleMaterialSelect, materialLookup],
  )

  const itemColumns = useMemo<TableColumnsType<ModuleLineItem>>(() => {
    if (!config.itemColumns?.length) return []

    const cols: TableColumnsType<ModuleLineItem> = []

    if (canManageItems) {
      cols.push(
        ...buildModuleEditorManagementColumns({
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
  }, [
    canManageItems,
    config,
    formatCellValue,
    handleItemInputChange,
    handleItemNumberChange,
    handleResolvedMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
    isItemColumnEditable,
    items,
    materialOptions,
    onDragEnd,
    onDragOver,
    onDragStart,
    onSelectAll,
    onSelectItem,
    orderedVisibleItemColumns,
    selectedItemIds,
    warehouses,
  ])

  const toggleItemColumn = useCallback(
    (key: string) => {
      const next = { ...columnVisibility }
      if (next[key] === false) {
        delete next[key]
      } else {
        next[key] = false
      }
      handleColumnVisibilityChange(next)
    },
    [columnVisibility, handleColumnVisibilityChange],
  )

  return {
    itemColumns,
    itemColumnOrder,
    onItemColumnOrderChange: handleColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
