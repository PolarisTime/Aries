import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  type CreatedExpenseMaterial,
  createExpenseMaterial,
  fetchAllMaterialOptions,
  fetchMaterialSearch,
} from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import {
  MATERIAL_SEARCH_DEBOUNCE_MS,
  mergeMaterialRecords,
} from '@/module-system/editor/module-editor-material-options'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
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
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('')
  const [debouncedMaterialSearchKeyword, setDebouncedMaterialSearchKeyword] =
    useState('')

  // 附加费用主数据可能排在分页末页，按类型单独分页拉全，
  // 保证本地结构化/拼音过滤能覆盖全部费用项。
  const { data: expenseMaterials = [] } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.expenseMaterial,
    queryFn: () => fetchAllMaterialOptions(EXPENSE_MATERIAL_TYPE),
    enabled: open && !!token,
    staleTime: STALE_MASTER_OPTIONS,
  })

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

  // 附加费用超过首页 200 条时同样需要在服务端搜索，否则只能快捷新增出重复项。
  const { data: expenseSearchPage, isFetching: isExpenseSearchFetching } =
    useQuery({
      queryKey: QUERY_KEYS.masterOptions.expenseMaterialSearch(
        debouncedMaterialSearchKeyword,
      ),
      queryFn: ({ signal }) =>
        fetchMaterialSearch(
          debouncedMaterialSearchKeyword,
          200,
          EXPENSE_MATERIAL_TYPE,
          signal,
        ),
      enabled: open && !!token && debouncedMaterialSearchKeyword.length > 0,
      staleTime: STALE_MASTER_OPTIONS,
      placeholderData: keepPreviousData,
    })

  const expenseMaterialRecords = useMemo(() => {
    const searchResults = debouncedMaterialSearchKeyword
      ? (expenseSearchPage?.content ?? [])
      : []
    return mergeMaterialRecords(searchResults, expenseMaterials)
  }, [debouncedMaterialSearchKeyword, expenseSearchPage, expenseMaterials])

  // 仅保留“附加费用”类型的商品作为费用项候选，并过滤掉缺名称/ID 的脏数据。
  const expenseMaterialOptions = useMemo(() => {
    return expenseMaterialRecords.flatMap((material) => {
      if (asString(material.materialType) !== EXPENSE_MATERIAL_TYPE) return []
      const label = asString(material.material).trim()
      const value = asString(material.id).trim()
      if (!label || !value) return []
      const unit = asString(material.unit).trim()
      return [
        {
          label,
          value,
          ...(unit ? { unit } : {}),
          materialType: EXPENSE_MATERIAL_TYPE,
        },
      ]
    })
  }, [expenseMaterialRecords])

  const expenseMaterialSearch: MaterialSearchController = {
    searching: isExpenseSearchFetching,
    onSearch: (keyword) => setMaterialSearchKeyword(keyword),
    onClose: () => {
      setMaterialSearchKeyword('')
      setDebouncedMaterialSearchKeyword('')
    },
  }

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
    expenseMaterialSearch,
    expenseSelectedItemIds,
    handleCreateExpense,
    handleExpenseAddItem,
    handleExpenseChange,
    handleExpenseDelete,
    handleExpenseSelectAll,
    handleExpenseSelectedChange,
  }
}
