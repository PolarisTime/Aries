import { computed, hasInjectionContext, ref, watch, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import { useQueryClient } from '@tanstack/vue-query'
import type {
  ModuleLineItem,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import {
  buildOccupiedParentMap,
  buildParentImportState,
  findParentRecordByRelationNo,
} from './module-adapter-parent-import'
import { parseParentRelationNos } from './module-adapter-shared'

interface UseParentImportSupportOptions {
  editorForm: Record<string, unknown>
  editorItems: Ref<ModuleLineItem[]>
  editorSourceRecordId: Ref<string>
  editorVisible: Ref<boolean>
  parentImportConfig: Ref<ModuleParentImportDefinition | undefined>
  parentRows: Ref<ModuleRecord[]>
  moduleRows: Ref<ModuleRecord[]>
  cloneLineItems: (value: unknown) => ModuleLineItem[]
  fetchParentDetail?: (record: ModuleRecord) => Promise<ModuleRecord>
}

export function useParentImportSupport(options: UseParentImportSupportOptions) {
  const selectedParentId = ref<string>()
  const parentSelectorVisible = ref(false)
  const parentSelectorKeyword = ref('')
  const parentDetailMap = ref<Record<string, ModuleRecord>>({})
  const parentAvailabilityLoading = ref(false)
  let parentAvailabilityHydrateToken = 0

  const selectedParentRecord = computed(() =>
    availableParentRows.value.find((record) => record.id === selectedParentId.value)
      || options.parentRows.value.find((record) => record.id === selectedParentId.value)
      || null,
  )

  function shouldFilterByImportableQuantity() {
    const config = options.parentImportConfig.value
    return config?.parentModuleKey === 'purchase-orders' && config.parentFieldKey === 'purchaseOrderNo'
  }

  const parentImportableQuantityVisible = computed(() => shouldFilterByImportableQuantity())

  function getSourceParentItemId(item: ModuleLineItem) {
    return String(item.sourceInboundItemId || item.sourcePurchaseOrderItemId || item.sourceSalesOrderItemId || item.id || '').trim()
  }

  function toSafeNumber(value: unknown) {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : 0
  }

  function resolveParentRecordWithDetail(record: ModuleRecord) {
    return parentDetailMap.value[String(record.id)] || record
  }

  function buildCurrentAllocatedQuantityMap(parentNo: string) {
    const currentAllocatedQuantityMap = new Map<string, number>()
    options.editorItems.value
      .filter((item) => String(item._parentRelationNo || '') === parentNo)
      .forEach((item) => {
        const sourceParentItemId = getSourceParentItemId(item)
        if (!sourceParentItemId) {
          return
        }
        currentAllocatedQuantityMap.set(
          sourceParentItemId,
          toSafeNumber(currentAllocatedQuantityMap.get(sourceParentItemId)) + toSafeNumber(item.quantity),
        )
      })
    return currentAllocatedQuantityMap
  }

  function getParentImportableQuantity(record: ModuleRecord) {
    if (!shouldFilterByImportableQuantity()) {
      return undefined
    }
    const quantityKey = options.parentImportConfig.value?.remainingQuantityKey || 'remainingQuantity'
    const parentRecord = resolveParentRecordWithDetail(record)
    if (!Array.isArray(parentRecord.items)) {
      return undefined
    }
    const currentAllocatedQuantityMap = buildCurrentAllocatedQuantityMap(getParentRelationNo(parentRecord))
    return parentRecord.items.reduce((sum, item) => {
      const sourceParentItemId = getSourceParentItemId(item)
      const remainingQuantity = toSafeNumber(item[quantityKey] ?? item.remainingQuantity ?? item.quantity)
      const currentAllocatedQuantity = sourceParentItemId
        ? toSafeNumber(currentAllocatedQuantityMap.get(sourceParentItemId))
        : 0
      return sum + remainingQuantity + currentAllocatedQuantity
    }, 0)
  }

  async function hydrateParentAvailabilityDetails() {
    if (!shouldFilterByImportableQuantity() || !options.fetchParentDetail || !options.parentRows.value.length) {
      return
    }
    const token = ++parentAvailabilityHydrateToken
    parentAvailabilityLoading.value = true
    try {
      const rowsNeedingDetail = options.parentRows.value.filter((record) =>
        !Array.isArray(record.items) && !parentDetailMap.value[String(record.id)],
      )
      const nextDetailMap: Record<string, ModuleRecord> = { ...parentDetailMap.value }
      const concurrency = 8
      for (let index = 0; index < rowsNeedingDetail.length; index += concurrency) {
        if (token !== parentAvailabilityHydrateToken) {
          return
        }
        const batch = rowsNeedingDetail.slice(index, index + concurrency)
        const detailRows = await Promise.all(
          batch.map(async (record) => {
            try {
              return await options.fetchParentDetail?.(record)
            } catch {
              return null
            }
          }),
        )
        detailRows.forEach((detail, detailIndex) => {
          if (detail) {
            nextDetailMap[String(batch[detailIndex].id)] = detail
          }
        })
        parentDetailMap.value = { ...nextDetailMap }
      }
    } finally {
      if (token === parentAvailabilityHydrateToken) {
        parentAvailabilityLoading.value = false
      }
    }
  }

  function getParentRecordLabel(record: ModuleRecord) {
    const primaryNo = options.parentImportConfig.value
      ? String(record[options.parentImportConfig.value.parentDisplayFieldKey] || record.id)
      : String(record.id)
    const extras = [
      record.customerName,
      record.supplierName,
      record.projectName,
      record.warehouseName,
    ]
      .filter(Boolean)
      .map((item) => String(item))

    return [primaryNo, ...extras.slice(0, 2)].join(' / ')
  }

  function getParentRelationNo(record: ModuleRecord) {
    if (!options.parentImportConfig.value) {
      return ''
    }

    return String(record[options.parentImportConfig.value.parentDisplayFieldKey] || '')
  }

  function getParentOptionLabel(parentRecord: ModuleRecord) {
    return getParentRecordLabel(parentRecord)
  }

  const occupiedParentMap = computed<Record<string, ModuleRecord>>(() => {
    if (!options.parentImportConfig.value?.enforceUniqueRelation) {
      return {}
    }

    return buildOccupiedParentMap(
      options.moduleRows.value,
      options.parentImportConfig.value.parentFieldKey,
      String(options.editorSourceRecordId.value || ''),
    )
  })

  const availableParentRows = computed(() => {
    const rows = options.parentRows.value
    if (!options.parentImportConfig.value?.enforceUniqueRelation) {
      return shouldFilterByImportableQuantity()
        ? rows.filter((record) => toSafeNumber(getParentImportableQuantity(record)) > 0)
        : rows
    }

    return rows
      .filter((record) => !occupiedParentMap.value[getParentRelationNo(record)])
      .filter((record) => !shouldFilterByImportableQuantity() || toSafeNumber(getParentImportableQuantity(record)) > 0)
  })

  const parentSelectorRows = computed(() => {
    const keyword = parentSelectorKeyword.value.trim().toLowerCase()
    if (!keyword) {
      return availableParentRows.value
    }

    return availableParentRows.value.filter((record) =>
      getParentOptionLabel(record).toLowerCase().includes(keyword),
    )
  })

  const parentSelectorRowSelection = computed(() => ({
    type: 'radio',
    selectedRowKeys: selectedParentId.value ? [selectedParentId.value] : [],
    onChange: (keys: Array<string | number>) => {
      selectedParentId.value = keys[0] ? String(keys[0]) : undefined
    },
  }))

  function closeParentSelector() {
    parentSelectorVisible.value = false
  }

  const queryClient = hasInjectionContext() ? useQueryClient() : null

  async function openParentSelector() {
    parentSelectorKeyword.value = ''
    parentSelectorVisible.value = true
    const parentModuleKey = options.parentImportConfig.value?.parentModuleKey
    if (parentModuleKey && queryClient) {
      await queryClient.refetchQueries({
        queryKey: ['business-parent-search'],
        exact: false,
      })
    }
    void hydrateParentAvailabilityDetails()
  }

  function syncSelectedParentRecord() {
    if (
      !options.editorVisible.value
      || !options.parentImportConfig.value
      || selectedParentId.value
      || !options.parentRows.value.length
    ) {
      return
    }

    const currentParentNos = parseParentRelationNos(options.editorForm[options.parentImportConfig.value.parentFieldKey])
    if (currentParentNos.length !== 1) {
      return
    }

    const matchedParent = findParentRecordByRelationNo(
      options.parentRows.value,
      options.parentImportConfig.value.parentDisplayFieldKey,
      currentParentNos[0],
    )

    if (matchedParent) {
      selectedParentId.value = matchedParent.id
    }
  }

  async function handleImportParentItems(targetParentRecord?: ModuleRecord) {
    if (!options.parentImportConfig.value) {
      return
    }

    const targetRecord = targetParentRecord || selectedParentRecord.value
    if (!targetRecord) {
      message.warning('请先选择上级单据')
      return
    }

    let parentRecord = targetRecord
    try {
      if (options.fetchParentDetail && !Array.isArray(targetRecord.items)) {
        parentRecord = await options.fetchParentDetail(targetRecord)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取上级单据详情失败')
      return
    }

    if (!parentRecord) {
      message.warning('请先选择上级单据')
      return
    }

    if (options.parentImportConfig.value.enforceUniqueRelation && occupiedParentMap.value[getParentRelationNo(parentRecord)]) {
      message.warning(`${options.parentImportConfig.value.label}已被其他单据占用，请重新选择`)
      return
    }

    const currentParentNos = parseParentRelationNos(options.editorForm[options.parentImportConfig.value.parentFieldKey])
    const importState = buildParentImportState({
      parentImportConfig: options.parentImportConfig.value,
      parentRecord,
      currentParentNos,
      currentItems: JSON.parse(JSON.stringify(options.editorItems.value)) as ModuleLineItem[],
      cloneLineItems: options.cloneLineItems,
    })
    if (importState.importedItemCount === 0) {
      message.warning(`${options.parentImportConfig.value.label}没有可导入的剩余数量`)
      return
    }

    options.editorForm[options.parentImportConfig.value.parentFieldKey] = importState.parentNosText
    if (importState.shouldApplyMappedValues) {
      Object.assign(options.editorForm, importState.mappedValues)
    }
    options.editorForm.items = importState.nextItems

    closeParentSelector()
    message.success(
      importState.hasImportedCurrentParent
        ? `${options.parentImportConfig.value.label}明细已更新`
        : `${options.parentImportConfig.value.label}明细已追加`,
    )
  }

  function getParentSelectorRowProps(record: ModuleRecord) {
    return {
      onDblclick: async () => {
        selectedParentId.value = String(record.id)
        await handleImportParentItems(record)
      },
    }
  }

  function resetParentImportState() {
    selectedParentId.value = undefined
    parentSelectorVisible.value = false
    parentSelectorKeyword.value = ''
  }

  watch(
    () => [options.editorVisible.value, options.parentRows.value, options.parentImportConfig.value?.parentFieldKey] as const,
    () => {
      syncSelectedParentRecord()
    },
  )

  watch(
    () => options.parentRows.value.map((record) => String(record.id)).join('\u0001'),
    () => {
      if (parentSelectorVisible.value) {
        void hydrateParentAvailabilityDetails()
      }
    },
  )

  return {
    availableParentRows,
    closeParentSelector,
    getParentOptionLabel,
    getParentImportableQuantity,
    getParentRelationNo,
    getParentSelectorRowProps,
    handleImportParentItems,
    occupiedParentMap,
    openParentSelector,
    parentAvailabilityLoading,
    parentImportableQuantityVisible,
    parentSelectorKeyword,
    parentSelectorRowSelection,
    parentSelectorRows,
    parentSelectorVisible,
    resetParentImportState,
    selectedParentId,
    selectedParentRecord,
  }
}
