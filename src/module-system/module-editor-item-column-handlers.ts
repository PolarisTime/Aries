import { useCallback } from 'react'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { recalculateEditorLineItem } from '@/module-system/module-adapter-editor'

interface Props {
  setItems: React.Dispatch<React.SetStateAction<ModuleLineItem[]>>
}

type MaterialDraftApplicator = (
  item: ModuleLineItem,
  materialRecord?: ModuleRecord | null,
) => ModuleLineItem

type MaterialLookupResolver = (
  materialCode: string,
) => Promise<ModuleRecord | null>

export function useModuleEditorItemColumnHandlers({ setItems }: Props) {
  const handleItemNumberChange = useCallback(
    (itemId: string, key: string, value: unknown) => {
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
    },
    [setItems],
  )

  const handleItemInputChange = useCallback(
    (itemId: string, key: string, value: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, [key]: value } : item,
        ),
      )
    },
    [setItems],
  )

  const handleMaterialSelect = useCallback(
    (
      itemId: string,
      materialCode: string,
      materialRecord?: ModuleRecord | null,
      applyMaterial?: MaterialDraftApplicator,
      resolveMaterial?: MaterialLookupResolver,
    ) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item
          const updated = { ...item, materialCode }
          if (applyMaterial) {
            return { ...applyMaterial(updated, materialRecord) }
          }
          return updated
        }),
      )

      if (!materialRecord && applyMaterial && resolveMaterial) {
        void resolveMaterial(materialCode).then((resolvedMaterial) => {
          if (!resolvedMaterial) {
            return
          }
          setItems((prev) =>
            prev.map((item) => {
              if (item.id !== itemId) {
                return item
              }
              if (asString(item.materialCode).trim() !== materialCode.trim()) {
                return item
              }
              const applied = applyMaterial({ ...item }, resolvedMaterial)
              return { ...applied }
            }),
          )
        })
      }
    },
    [setItems],
  )

  const handleWarehouseSelect = useCallback(
    (itemId: string, warehouseName: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, warehouseName } : item,
        ),
      )
    },
    [setItems],
  )

  const handleSettlementModeChange = useCallback(
    (itemId: string, settlementMode: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item
          const updated = { ...item, settlementMode }
          return recalculateEditorLineItem(updated, 'settlementMode')
        }),
      )
    },
    [setItems],
  )

  return {
    handleItemInputChange,
    handleItemNumberChange,
    handleMaterialSelect,
    handleSettlementModeChange,
    handleWarehouseSelect,
  }
}
