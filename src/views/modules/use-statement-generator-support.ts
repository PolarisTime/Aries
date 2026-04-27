import { computed, ref, type Ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { getBusinessModuleDetail, listAllBusinessModuleRows } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildCustomerStatementDraftData,
  buildFreightStatementDraftData,
  buildSupplierStatementDraftData,
  getAvailableCustomerStatementOrders,
  getAvailableFreightStatementBills,
  getAvailableSupplierStatementInbounds,
  getCustomerStatementSelectionError,
  getFreightStatementSelectionError,
  getSupplierStatementSelectionError,
} from './module-adapter-statements'
import { buildModuleLineItemId } from './module-adapter-editor'

export interface FreightSummaryRow {
  id: string
  carrierName: string
  statementCount: number
  totalWeight: number
  totalFreight: number
  paidAmount: number
  unpaidAmount: number
}

const CUSTOMER_STATEMENT_RECEIPT_ZERO_SWITCH = 'SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER'
const SUPPLIER_STATEMENT_FULL_PAYMENT_SWITCH = 'SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE'

interface UseStatementGeneratorSupportOptions {
  canViewRecords: Ref<boolean>
  moduleKey: Ref<string>
  submittedFilters: Ref<Record<string, unknown>>
  createBaseDraft: () => ModuleRecord
  openEditorWithDraft: (draft: ModuleRecord) => void
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

import { cloneLineItems } from '@/utils/clone-utils'

async function loadEnabledSystemSwitches() {
  const generalSettings = await listAllBusinessModuleRows('general-settings', {})
  return new Set(
    generalSettings
      .filter((row) => String(row.status || '') === '正常')
      .map((row) => String(row.settingCode || '').trim())
      .filter(Boolean),
  )
}

async function hydrateModuleDetails(moduleKey: string, rows: ModuleRecord[]) {
  return Promise.all(rows.map(async (record) => {
    if (Array.isArray(record.items) && record.items.length) {
      return record
    }
    const response = await getBusinessModuleDetail(moduleKey, String(record.id))
    if (!response.data) {
      throw new Error(response.message || '详情加载失败')
    }
    return response.data
  }))
}

export function useStatementGeneratorSupport(options: UseStatementGeneratorSupportOptions) {
  const supplierStatementGeneratorVisible = ref(false)
  const supplierStatementGeneratorLoading = ref(false)
  const supplierStatementCandidateRows = ref<ModuleRecord[]>([])
  const supplierStatementSelectedInboundKeys = ref<string[]>([])

  const customerStatementGeneratorVisible = ref(false)
  const customerStatementGeneratorLoading = ref(false)
  const customerStatementCandidateRows = ref<ModuleRecord[]>([])
  const customerStatementSelectedOrderKeys = ref<string[]>([])

  const freightStatementGeneratorVisible = ref(false)
  const freightStatementGeneratorLoading = ref(false)
  const freightStatementCandidateRows = ref<ModuleRecord[]>([])
  const freightStatementSelectedBillKeys = ref<string[]>([])

  const freightSummaryVisible = ref(false)
  const freightSummaryLoading = ref(false)
  const freightSummaryRows = ref<FreightSummaryRow[]>([])

  const supplierStatementSelectedInbounds = computed(() =>
    supplierStatementCandidateRows.value.filter((record) =>
      supplierStatementSelectedInboundKeys.value.includes(String(record.id)),
    ),
  )
  const supplierStatementSelectedSupplierName = computed(() =>
    String(supplierStatementSelectedInbounds.value[0]?.supplierName || ''),
  )
  const supplierStatementRowSelection = computed(() => ({
    selectedRowKeys: supplierStatementSelectedInboundKeys.value,
    onChange: (keys: Array<string | number>) => {
      supplierStatementSelectedInboundKeys.value = keys.map((key) => String(key))
    },
    getCheckboxProps: (record: ModuleRecord) => ({
      disabled: Boolean(
        supplierStatementSelectedSupplierName.value
        && supplierStatementSelectedSupplierName.value !== String(record.supplierName || ''),
      ),
    }),
  }))

  const customerStatementSelectedOrders = computed(() =>
    customerStatementCandidateRows.value.filter((record) =>
      customerStatementSelectedOrderKeys.value.includes(String(record.id)),
    ),
  )
  const customerStatementSelectedCustomerName = computed(() =>
    String(customerStatementSelectedOrders.value[0]?.customerName || ''),
  )
  const customerStatementSelectedProjectName = computed(() =>
    String(customerStatementSelectedOrders.value[0]?.projectName || ''),
  )
  const customerStatementRowSelection = computed(() => ({
    selectedRowKeys: customerStatementSelectedOrderKeys.value,
    onChange: (keys: Array<string | number>) => {
      customerStatementSelectedOrderKeys.value = keys.map((key) => String(key))
    },
    getCheckboxProps: (record: ModuleRecord) => ({
      disabled: Boolean(
        (
          customerStatementSelectedCustomerName.value
          && customerStatementSelectedCustomerName.value !== String(record.customerName || '')
        ) || (
          customerStatementSelectedProjectName.value
          && customerStatementSelectedProjectName.value !== String(record.projectName || '')
        ),
      ),
    }),
  }))

  const freightStatementSelectedBills = computed(() =>
    freightStatementCandidateRows.value.filter((record) =>
      freightStatementSelectedBillKeys.value.includes(String(record.id)),
    ),
  )
  const freightStatementSelectedCarrierName = computed(() =>
    String(freightStatementSelectedBills.value[0]?.carrierName || ''),
  )
  const freightStatementRowSelection = computed(() => ({
    selectedRowKeys: freightStatementSelectedBillKeys.value,
    onChange: (keys: Array<string | number>) => {
      freightStatementSelectedBillKeys.value = keys.map((key) => String(key))
    },
    getCheckboxProps: (record: ModuleRecord) => ({
      disabled: Boolean(
        freightStatementSelectedCarrierName.value
        && freightStatementSelectedCarrierName.value !== String(record.carrierName || ''),
      ),
    }),
  }))

  function closeSupplierStatementGenerator() {
    supplierStatementGeneratorVisible.value = false
    supplierStatementGeneratorLoading.value = false
    supplierStatementCandidateRows.value = []
    supplierStatementSelectedInboundKeys.value = []
  }

  function closeCustomerStatementGenerator() {
    customerStatementGeneratorVisible.value = false
    customerStatementGeneratorLoading.value = false
    customerStatementCandidateRows.value = []
    customerStatementSelectedOrderKeys.value = []
  }

  function closeFreightStatementGenerator() {
    freightStatementGeneratorVisible.value = false
    freightStatementGeneratorLoading.value = false
    freightStatementCandidateRows.value = []
    freightStatementSelectedBillKeys.value = []
  }

  function resetStatementSupportState() {
    closeSupplierStatementGenerator()
    closeCustomerStatementGenerator()
    closeFreightStatementGenerator()
    freightSummaryVisible.value = false
    freightSummaryLoading.value = false
    freightSummaryRows.value = []
  }

  async function openFreightSummary() {
    if (!options.canViewRecords.value) {
      message.warning('暂无查看权限')
      return
    }

    freightSummaryLoading.value = true
    try {
      const rows = await listAllBusinessModuleRows(options.moduleKey.value, options.submittedFilters.value)
      if (!rows.length) {
        message.warning('当前筛选条件下没有可汇总的数据')
        return
      }

      const summaryMap: Record<string, FreightSummaryRow> = {}
      rows.forEach((record) => {
        const carrierName = String(record.carrierName || '未设置物流商')
        if (!summaryMap[carrierName]) {
          summaryMap[carrierName] = {
            id: carrierName,
            carrierName,
            statementCount: 0,
            totalWeight: 0,
            totalFreight: 0,
            paidAmount: 0,
            unpaidAmount: 0,
          }
        }

        summaryMap[carrierName].statementCount += 1
        summaryMap[carrierName].totalWeight += Number(record.totalWeight || 0)
        summaryMap[carrierName].totalFreight += Number(record.totalFreight || 0)
        summaryMap[carrierName].paidAmount += Number(record.paidAmount || 0)
        summaryMap[carrierName].unpaidAmount += Number(record.unpaidAmount || 0)
      })

      freightSummaryRows.value = Object.values(summaryMap).map((item) => ({
        ...item,
        totalWeight: Number(item.totalWeight.toFixed(3)),
        totalFreight: Number(item.totalFreight.toFixed(2)),
        paidAmount: Number(item.paidAmount.toFixed(2)),
        unpaidAmount: Number(item.unpaidAmount.toFixed(2)),
      }))
      freightSummaryVisible.value = true
    } catch (error) {
      options.showRequestError(error, '汇总加载失败')
    } finally {
      freightSummaryLoading.value = false
    }
  }

  async function openSupplierStatementGenerator() {
    supplierStatementGeneratorLoading.value = true
    supplierStatementSelectedInboundKeys.value = []
    supplierStatementGeneratorVisible.value = true

    try {
      const [inbounds, statements] = await Promise.all([
        listAllBusinessModuleRows('purchase-inbounds', {}),
        listAllBusinessModuleRows('supplier-statements', {}),
      ])
      supplierStatementCandidateRows.value = getAvailableSupplierStatementInbounds(inbounds, statements)

      if (!supplierStatementCandidateRows.value.length) {
        message.warning('没有可生成对账单的采购入库单')
      }
    } catch (error) {
      options.showRequestError(error, '采购入库单加载失败')
      closeSupplierStatementGenerator()
    } finally {
      supplierStatementGeneratorLoading.value = false
    }
  }

  async function openCustomerStatementGenerator() {
    customerStatementGeneratorLoading.value = true
    customerStatementSelectedOrderKeys.value = []
    customerStatementGeneratorVisible.value = true

    try {
      const [orders, statements] = await Promise.all([
        listAllBusinessModuleRows('sales-orders', {}),
        listAllBusinessModuleRows('customer-statements', {}),
      ])
      customerStatementCandidateRows.value = getAvailableCustomerStatementOrders(orders, statements)

      if (!customerStatementCandidateRows.value.length) {
        message.warning('没有可生成对账单的销售订单')
      }
    } catch (error) {
      options.showRequestError(error, '销售订单加载失败')
      closeCustomerStatementGenerator()
    } finally {
      customerStatementGeneratorLoading.value = false
    }
  }

  async function openFreightStatementGenerator() {
    freightStatementGeneratorLoading.value = true
    freightStatementSelectedBillKeys.value = []
    freightStatementGeneratorVisible.value = true

    try {
      const [bills, statements] = await Promise.all([
        listAllBusinessModuleRows('freight-bills', {}),
        listAllBusinessModuleRows('freight-statements', {}),
      ])
      freightStatementCandidateRows.value = getAvailableFreightStatementBills(bills, statements)

      if (!freightStatementCandidateRows.value.length) {
        message.warning('没有可生成对账单的物流单')
      }
    } catch (error) {
      options.showRequestError(error, '物流单加载失败')
      closeFreightStatementGenerator()
    } finally {
      freightStatementGeneratorLoading.value = false
    }
  }

  async function buildSupplierStatementDraft(sourceInbounds: ModuleRecord[]) {
    const detailedInbounds = await hydrateModuleDetails('purchase-inbounds', sourceInbounds)
    const baseDraft = options.createBaseDraft()
    const payments = await listAllBusinessModuleRows('payments', {})
    const enabledSwitches = await loadEnabledSystemSwitches()
    return buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: detailedInbounds,
      payments,
      today: dayjs().format('YYYY-MM-DD'),
      defaultFullPayment: enabledSwitches.has(SUPPLIER_STATEMENT_FULL_PAYMENT_SWITCH),
      cloneLineItems,
      buildLineItemId: buildModuleLineItemId,
    })
  }

  async function buildCustomerStatementDraft(sourceOrders: ModuleRecord[]) {
    const detailedOrders = await hydrateModuleDetails('sales-orders', sourceOrders)
    const enabledSwitches = await loadEnabledSystemSwitches()
    return buildCustomerStatementDraftData({
      baseDraft: options.createBaseDraft(),
      sourceOrders: detailedOrders,
      today: dayjs().format('YYYY-MM-DD'),
      defaultReceiptAmountZero: enabledSwitches.has(CUSTOMER_STATEMENT_RECEIPT_ZERO_SWITCH),
      cloneLineItems,
      buildLineItemId: buildModuleLineItemId,
    })
  }

  async function buildFreightStatementDraft(sourceBills: ModuleRecord[]) {
    const detailedBills = await hydrateModuleDetails('freight-bills', sourceBills)
    return buildFreightStatementDraftData({
      baseDraft: options.createBaseDraft(),
      sourceBills: detailedBills,
      today: dayjs().format('YYYY-MM-DD'),
      cloneLineItems,
      buildLineItemId: buildModuleLineItemId,
    })
  }

  async function handleGenerateCustomerStatement() {
    const validationMessage = getCustomerStatementSelectionError(customerStatementSelectedOrders.value)
    if (validationMessage) {
      message.warning(validationMessage)
      return
    }

    try {
      options.openEditorWithDraft(await buildCustomerStatementDraft(customerStatementSelectedOrders.value))
      closeCustomerStatementGenerator()
    } catch (error) {
      options.showRequestError(error, '客户对账单草稿生成失败')
    }
  }

  async function handleGenerateSupplierStatement() {
    const validationMessage = getSupplierStatementSelectionError(supplierStatementSelectedInbounds.value)
    if (validationMessage) {
      message.warning(validationMessage)
      return
    }

    try {
      options.openEditorWithDraft(await buildSupplierStatementDraft(supplierStatementSelectedInbounds.value))
      closeSupplierStatementGenerator()
    } catch (error) {
      options.showRequestError(error, '供应商对账单草稿生成失败')
    }
  }

  async function handleGenerateFreightStatement() {
    const validationMessage = getFreightStatementSelectionError(freightStatementSelectedBills.value)
    if (validationMessage) {
      message.warning(validationMessage)
      return
    }

    try {
      options.openEditorWithDraft(await buildFreightStatementDraft(freightStatementSelectedBills.value))
      closeFreightStatementGenerator()
    } catch (error) {
      options.showRequestError(error, '物流对账单草稿生成失败')
    }
  }

  return {
    closeCustomerStatementGenerator,
    closeFreightStatementGenerator,
    closeSupplierStatementGenerator,
    customerStatementCandidateRows,
    customerStatementGeneratorLoading,
    customerStatementGeneratorVisible,
    customerStatementRowSelection,
    customerStatementSelectedCustomerName,
    customerStatementSelectedOrders,
    customerStatementSelectedProjectName,
    freightStatementCandidateRows,
    freightStatementGeneratorLoading,
    freightStatementGeneratorVisible,
    freightStatementRowSelection,
    freightStatementSelectedBills,
    freightStatementSelectedCarrierName,
    freightSummaryLoading,
    freightSummaryRows,
    freightSummaryVisible,
    handleGenerateCustomerStatement,
    handleGenerateFreightStatement,
    handleGenerateSupplierStatement,
    openCustomerStatementGenerator,
    openFreightStatementGenerator,
    openFreightSummary,
    openSupplierStatementGenerator,
    resetStatementSupportState,
    supplierStatementCandidateRows,
    supplierStatementGeneratorLoading,
    supplierStatementGeneratorVisible,
    supplierStatementRowSelection,
    supplierStatementSelectedInbounds,
    supplierStatementSelectedSupplierName,
  }
}
