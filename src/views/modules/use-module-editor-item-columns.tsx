import type { TableColumnsType } from 'antd'
import { useCallback, useMemo } from 'react'
import { fetchMaterialSearch } from '@/api/materials'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
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
  const { warehouses, materials } = useMasterOptions()
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
    const entries = materials
      .map((record) => {
        const materialCode = String(record.materialCode || '').trim()
        if (!materialCode) {
          return null
        }
        return [materialCode.toLowerCase(), record] as const
      })
      .filter(Boolean) as Array<readonly [string, Record<string, unknown>]>

    return new Map(entries)
  }, [materials])

  const materialOptions = useMemo(() => {
    const seen = new Set<string>()

    return materials
      .map((record) => {
        const materialCode = String(record.materialCode || '').trim()
        if (!materialCode) {
          return null
        }

        const normalizedCode = materialCode.toLowerCase()
        if (seen.has(normalizedCode)) {
          return null
        }
        seen.add(normalizedCode)

        const brand = String(record.brand || '').trim()
        const category = String(record.category || '').trim()
        const material = String(record.material || '').trim()
        const spec = String(record.spec || '').trim()
        const length = String(record.length || '').trim()
        const materialName = String(record.materialName || '').trim()

        return {
          label: [materialCode, brand || materialName, material, spec, length]
            .filter(Boolean)
            .join(' | '),
          searchText: [
            materialCode,
            brand,
            materialName,
            category,
            material,
            spec,
            length,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          value: materialCode,
        }
      })
      .filter(Boolean) as Array<{
      label: string
      searchText: string
      value: string
    }>
  }, [materials])

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
        applyMaterialToEditorLineItem,
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
    selectedItemIds,
    warehouses,
  ])

  return {
    itemColumns,
  }
}
