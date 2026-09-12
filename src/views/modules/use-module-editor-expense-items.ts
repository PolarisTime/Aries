import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  type CreatedExpenseMaterial,
  createExpenseMaterial,
  fetchMaterialSearch,
} from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'

/** 附加费用类主数据标识，前后端一致。 */
const EXPENSE_MATERIAL_TYPE = '附加费用'

interface Options {
  open: boolean
  expenseItems: DocumentChargeItemDraft[]
  updateExpenseItems: (
    updater: (current: DocumentChargeItemDraft[]) => DocumentChargeItemDraft[],
  ) => void
}

/** 编辑器“附加费用”Tab 的选择状态、快捷建项与行级增删改。 */
export function useModuleEditorExpenseItems({
  open,
  expenseItems,
  updateExpenseItems,
}: Options) {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const [expenseSelectedItemIds, setExpenseSelectedItemIds] = useState<
    string[]
  >([])

  // 附加费用主数据可能排在分页末页，必须在后端按类型过滤后单独拉取，
  // 不能在“商品全量前 200 条”里做客户端过滤，否则费用项永远取不到。
  const { data: expenseMaterials = [] } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.expenseMaterial,
    queryFn: () =>
      fetchMaterialSearch('', 200, EXPENSE_MATERIAL_TYPE).then(
        (response) => response.content,
      ),
    enabled: open && !!token,
    staleTime: STALE_MASTER_OPTIONS,
  })

  // 仅保留“附加费用”类型的商品作为费用项候选，并过滤掉缺名称/ID 的脏数据。
  const expenseMaterialOptions = useMemo(() => {
    return expenseMaterials.flatMap((material) => {
      if (material.materialType !== EXPENSE_MATERIAL_TYPE) return []
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
  }, [expenseMaterials])

  const handleCreateExpense = async (
    name: string,
  ): Promise<CreatedExpenseMaterial | undefined> => {
    // 快捷创建：静默写入商品资料（附加费用类型），成功后刷新选项缓存。
    try {
      const created = await createExpenseMaterial(name)
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.material,
      })
      return created
    } catch (error) {
      message.error(error instanceof Error ? error.message : '费用项创建失败')
      return undefined
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
