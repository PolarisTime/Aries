import { computed, ref, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import { getBusinessModuleDetail, saveBusinessModule } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { cloneRecord } from '@/utils/clone-utils'

interface UseFreightPickupListOptions {
  moduleKey: Ref<string>
  canExportRecords: Ref<boolean>
  canAuditRecords: Ref<boolean>
  selectedRowKeys: Ref<Array<string | number>>
  selectedRowMap: Ref<Record<string, ModuleRecord>>
  isSuccessCode: (code: unknown) => boolean
  showRequestError: (error: unknown, fallbackMessage: string) => void
  refreshModuleQueries: () => Promise<void>
}

function buildFreightPickupListRows(records: ModuleRecord[]) {
  return records.flatMap((record, recordIndex) =>
    (record.items || []).map((item, itemIndex) => ({
      id: `${record.id || recordIndex}-${item.id || itemIndex + 1}`,
      brand: item.brand || '',
      material: item.material || '',
      spec: item.spec || '',
      length: item.length || '',
      quantity: Number(item.quantity || 0),
      quantityUnit: item.quantityUnit || '件',
      totalWeight: Number(item.weightTon || 0),
      weightUnit: '吨',
      warehouseName: item.warehouseName || '',
      customerName: item.customerName || record.customerName || '',
    })),
  )
}

export function useFreightPickupList(options: UseFreightPickupListOptions) {
  const {
    moduleKey,
    canExportRecords,
    canAuditRecords,
    selectedRowKeys,
    selectedRowMap,
    isSuccessCode,
    showRequestError,
    refreshModuleQueries,
  } = options

  const freightPickupListVisible = ref(false)
  const freightPickupListLoading = ref(false)
  const freightPickupListRows = ref<ModuleRecord[]>([])
  const freightPickupListSelectedBills = ref<ModuleRecord[]>([])

  const freightPickupListCarrierNames = computed(() =>
    Array.from(
      new Set(
        freightPickupListSelectedBills.value
          .map((record) => String(record.carrierName || '').trim())
          .filter(Boolean),
      ),
    ),
  )

  const freightPickupListBillNos = computed(() =>
    freightPickupListSelectedBills.value
      .map((record) => String(record.billNo || '').trim())
      .filter(Boolean),
  )

  const freightPickupListTotalWeight = computed(() =>
    freightPickupListRows.value.reduce((sum, item) => sum + Number(item.totalWeight || 0), 0),
  )

  function closeFreightPickupList() {
    freightPickupListVisible.value = false
    freightPickupListLoading.value = false
    freightPickupListRows.value = []
    freightPickupListSelectedBills.value = []
  }

  async function resolveModuleDetailRecord(record: ModuleRecord) {
    if (Array.isArray(record.items) && record.items.length) {
      return record
    }
    const response = await getBusinessModuleDetail(moduleKey.value, String(record.id))
    if (!isSuccessCode(response.code) || !response.data) {
      throw new Error(response.message || '获取物流单详情失败')
    }
    return response.data
  }

  async function openFreightPickupList() {
    if (!canExportRecords.value) {
      message.warning('暂无导出权限')
      return
    }

    const selectedRecords = selectedRowKeys.value
      .map((key) => selectedRowMap.value[key])
      .filter(Boolean)

    if (!selectedRecords.length) {
      message.warning('请先勾选需要生成提货清单的物流单')
      return
    }

    const carrierNames = Array.from(
      new Set(selectedRecords.map((record) => String(record.carrierName || '').trim()).filter(Boolean)),
    )
    if (carrierNames.length > 1) {
      message.warning('提货清单仅支持同一物流商的物流单合并生成')
      return
    }

    freightPickupListLoading.value = true
    try {
      const detailedRecords = await Promise.all(selectedRecords.map((record) => resolveModuleDetailRecord(record)))
      const pickupRows = buildFreightPickupListRows(detailedRecords)
      if (!pickupRows.length) {
        message.warning('所选物流单没有可生成的明细数据')
        return
      }

      freightPickupListSelectedBills.value = detailedRecords
      freightPickupListRows.value = pickupRows
      freightPickupListVisible.value = true
    } catch (error) {
      showRequestError(error, '提货清单生成失败')
    } finally {
      freightPickupListLoading.value = false
    }
  }

  async function markSelectedFreightDelivered() {
    if (!canAuditRecords.value) {
      message.warning('暂无审核权限')
      return
    }
    const selectedRecords = selectedRowKeys.value
      .map((key) => selectedRowMap.value[key])
      .filter(Boolean)

    if (!selectedRecords.length) {
      message.warning('请先勾选需要标记送达的物流单')
      return
    }

    try {
      await Promise.all(
        selectedRecords.map((record) =>
          saveBusinessModule(moduleKey.value, {
            ...cloneRecord(record),
            deliveryStatus: '已送达',
            status: String(record.status || '') === '未审核' ? '已审核' : record.status,
          }),
        ),
      )
      selectedRowKeys.value = []
      selectedRowMap.value = {}
      await refreshModuleQueries()
      message.success(`已更新 ${selectedRecords.length} 张物流单`)
    } catch (error) {
      showRequestError(error, '批量更新失败')
    }
  }

  return {
    freightPickupListVisible,
    freightPickupListLoading,
    freightPickupListRows,
    freightPickupListSelectedBills,
    freightPickupListCarrierNames,
    freightPickupListBillNos,
    freightPickupListTotalWeight,
    closeFreightPickupList,
    openFreightPickupList,
    markSelectedFreightDelivered,
  }
}
