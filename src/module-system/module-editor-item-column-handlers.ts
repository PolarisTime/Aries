import type { WarehouseOption } from '@/api/warehouse-options'
import { recalculateEditorLineItem } from '@/module-system/module-adapter-editor'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
}

type MaterialDraftApplicator = (
  item: ModuleLineItem,
  materialRecord?: ModuleRecord | null,
) => ModuleLineItem

export function useModuleEditorItemColumnHandlers({ setItems }: Props) {
  const handleItemNumberChange = (
    itemId: string,
    key: string,
    value: unknown,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = {
          ...item,
          [key]: value === null || value === undefined ? 0 : value,
        }
        return recalculateEditorLineItem(updated, key)
      }),
    )
  }

  const handleItemInputChange = (
    itemId: string,
    key: string,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item,
      ),
    )
  }

  const handleMaterialSelect = (
    itemId: string,
    materialId: string,
    materialRecord?: ModuleRecord | null,
    applyMaterial?: MaterialDraftApplicator,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = {
          ...item,
          materialId: materialId || undefined,
          materialCode: materialRecord
            ? asString(materialRecord.materialCode).trim()
            : '',
        }
        if (applyMaterial) {
          return { ...applyMaterial(updated, materialRecord) }
        }
        return updated
      }),
    )
  }

  const handleWarehouseSelect = (
    itemId: string,
    warehouseId: string,
    warehouse?: WarehouseOption | null,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              warehouseId: warehouseId || undefined,
              warehouseName: warehouse?.warehouseName || '',
            }
          : item,
      ),
    )
  }

  const handleSettlementModeChange = (
    itemId: string,
    settlementMode: string,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, settlementMode }
        return recalculateEditorLineItem(updated, 'settlementMode')
      }),
    )
  }

  return {
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  }
}
