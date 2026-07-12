import type { TableColumnsType } from 'antd'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import { isEditorItemColumnEditableForModule } from '@/module-system/module-adapter-editor'
import {
  buildModuleEditorDataColumns,
  buildModuleEditorManagementColumns,
} from '@/module-system/module-editor-item-column-builders'
import { useModuleEditorItemColumnHandlers } from '@/module-system/module-editor-item-column-handlers'
import { applyMaterialToEditorLineItem } from '@/module-system/module-editor-line-item-utils'
import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { buildPinyinSearchTokens } from '@/utils/pinyin-search'

interface Props {
  moduleKey: string
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
type MaterialSelectOption = {
  label: string
  searchText: string
  value: string
}

type MaterialSelectSearchFields = {
  materialCode: string
  brand: string
  materialName: string
  material: string
  spec: string
  length: string
}

function buildMaterialSelectSearchText({
  materialCode,
  brand,
  materialName,
  material,
  spec,
  length,
}: MaterialSelectSearchFields) {
  return [
    materialCode,
    brand,
    materialName,
    material,
    spec,
    length,
    ...buildPinyinSearchTokens(brand),
    ...buildPinyinSearchTokens(materialName),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
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

  const isItemColumnEditable = (columnKey: string, record?: ModuleLineItem) =>
    isEditorItemColumnEditableForModule(
      moduleKey,
      columnKey,
      canEditItemColumns,
      lineItemsLocked,
      record,
      parentImportedItemEditLocked,
    )

  const materialLookup = (() => {
    const entries = materials.flatMap((record): MaterialLookupEntry[] => {
      const materialId = record.id
      if (!materialId) {
        return []
      }
      return [[materialId, record]]
    })

    return new Map(entries)
  })()

  const materialOptions = (() => {
    const seen = new Set<string>()

    return materials.flatMap((record): MaterialSelectOption[] => {
      const materialId = record.id
      const materialCode = String(record.materialCode || '').trim()
      if (!materialId || !materialCode) {
        return []
      }

      if (seen.has(materialId)) {
        return []
      }
      seen.add(materialId)

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
          searchText: buildMaterialSelectSearchText({
            materialCode,
            brand,
            materialName,
            material,
            spec,
            length,
          }),
          value: materialId,
        },
      ]
    })
  })()
  const allItemColumnIds = (config.itemColumns || []).map(
    (column) => column.dataIndex,
  )
  const itemColumnOrder = mergeColumnOrder(
    allItemColumnIds,
    savedItemColumnOrder,
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
  })()

  const toggleItemColumn = (key: string) => {
    const next = { ...columnVisibility }
    if (next[key] === false) {
      delete next[key]
    } else {
      next[key] = false
    }
    handleColumnVisibilityChange(next)
  }

  return {
    itemColumns,
    itemColumnOrder,
    onItemColumnOrderChange: handleColumnOrderChange,
    toggleItemColumn,
    visibleItemColumnKeys,
  }
}
