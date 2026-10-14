import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type CreatedExpenseMaterial,
  createExpenseMaterial,
  fetchAllMaterialOptions,
  fetchMaterialSearch,
} from '@/api/master/materials'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { applyEditorLineItemOrder } from '@/module-system/adapter/module-adapter-editor'
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

  // 清空关键词时立即复位防抖值: 复位放在输入事件里而不是 effect 体内同步 setState,
  // 既保持"清空即回到全量候选"的既有语义, 又避免级联渲染。
  const handleMaterialSearchKeywordChange = (keyword: string) => {
    setMaterialSearchKeyword(keyword)
    if (!keyword.trim()) setDebouncedMaterialSearchKeyword('')
  }

  useEffect(() => {
    const keyword = materialSearchKeyword.trim()
    if (!keyword) return undefined
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
    onSearch: handleMaterialSearchKeywordChange,
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

  /*
   * 行 key: 持久化行用业务 id; 手工新增行没有 id, 用「对象身份 → 生成 key」的 WeakMap 记住,
   * 保证拖动重排后 key 跟着同一行对象走(用下标当 key 时, 重排后焦点保持会落到别的行上)。
   */
  const draftRowKeysRef = useRef(new WeakMap<DocumentChargeItemDraft, string>())
  const draftRowSeqRef = useRef(0)
  const expenseRowKeyOf = useCallback((item: DocumentChargeItemDraft) => {
    if (item.id) return String(item.id)
    const cached = draftRowKeysRef.current.get(item)
    if (cached !== undefined) return cached
    draftRowSeqRef.current += 1
    const key = `expense-draft-row-${draftRowSeqRef.current}`
    draftRowKeysRef.current.set(item, key)
    return key
  }, [])

  /**
   * 附加费用行序变化(整行长按拖动 / 键盘 Alt+↑↓): 只按新顺序重排数组, 不改行内容。
   * <p>后端口径是「items 数组顺序即最终顺序」, 且 `bd_document_charge_item.line_no` 由服务端
   * 按下标重编号(两阶段重编号解决唯一键冲突), 因此前端只需整组按新顺序下发。</p>
   */
  const handleExpenseReorder = (nextRowKeys: string[]) => {
    updateExpenseItems((current) =>
      applyEditorLineItemOrder(current, nextRowKeys, expenseRowKeyOf),
    )
  }

  /** 当前费用的行 key(顺序与 expenseItems 一致): 拖动作用域与行都用它做身份。 */
  const expenseRowKeys = useMemo(
    () => expenseItems.map(expenseRowKeyOf),
    [expenseItems, expenseRowKeyOf],
  )

  const handleExpenseAddItem = () => {
    updateExpenseItems((current) => [...current, { chargeName: '', amount: 0 }])
  }

  return {
    expenseMaterialOptions,
    expenseMaterialSearch,
    expenseSelectedItemIds,
    handleCreateExpense,
    handleExpenseAddItem,
    expenseRowKeys,
    expenseRowKeyOf,
    handleExpenseChange,
    handleExpenseDelete,
    handleExpenseReorder,
    handleExpenseSelectAll,
    handleExpenseSelectedChange,
  }
}
