import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { createExpenseMaterial } from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { message } from '@/utils/antd-app'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'

interface Options {
  masterMaterials: Array<{
    id?: string | number
    material?: string
    unit?: string
    materialType?: string
  }>
  expenseItems: DocumentChargeItemDraft[]
  updateExpenseItems: (
    updater: (current: DocumentChargeItemDraft[]) => DocumentChargeItemDraft[],
  ) => void
}

/** 编辑器“附加费用”Tab 的选择状态、快捷建项与行级增删改。 */
export function useModuleEditorExpenseItems({
  masterMaterials,
  expenseItems,
  updateExpenseItems,
}: Options) {
  const queryClient = useQueryClient()
  const [expenseSelectedItemIds, setExpenseSelectedItemIds] = useState<
    string[]
  >([])

  // 仅保留“附加费用”类型的商品作为费用项候选，并过滤掉缺名称/ID 的脏数据。
  const expenseMaterialOptions = useMemo(() => {
    return masterMaterials.flatMap((material) => {
      if (material.materialType !== '附加费用') return []
      const label = material.material || ''
      const value = String(material.id ?? '')
      if (!label || !value) return []
      return [
        {
          label,
          value,
          unit: material.unit,
          materialType: material.materialType,
        },
      ]
    })
  }, [masterMaterials])

  const handleCreateExpense = async (name: string): Promise<void> => {
    // 快捷创建：静默写入商品资料（附加费用类型），成功后刷新选项缓存。
    try {
      await createExpenseMaterial(name)
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.material,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '费用项创建失败')
    }
  }

  const handleExpenseSelectedChange = (itemId: string, selected: boolean) => {
    setExpenseSelectedItemIds((current) =>
      selected ? [...current, itemId] : current.filter((id) => id !== itemId),
    )
  }

  const handleExpenseSelectAll = (selected: boolean) => {
    setExpenseSelectedItemIds(
      selected ? expenseItems.map((item) => item.id ?? '') : [],
    )
  }

  const handleExpenseChange = (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => {
    updateExpenseItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    )
  }

  const handleExpenseDelete = (index: number) => {
    updateExpenseItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const handleExpenseAddItem = () => {
    updateExpenseItems((current) => [...current, { chargeName: '', amount: 0 }])
  }

  return {
    expenseMaterialOptions,
    expenseSelectedItemIds,
    handleCreateExpense,
    handleExpenseAddItem,
    handleExpenseChange,
    handleExpenseDelete,
    handleExpenseSelectAll,
    handleExpenseSelectedChange,
  }
}
