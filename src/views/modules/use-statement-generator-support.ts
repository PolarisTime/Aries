import { computed, ref, type Ref } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  listCustomerStatementCandidates,
  listFreightStatementCandidates,
  listSupplierStatementCandidates,
} from '@/api/business'
import { getStatementGeneratorRules } from '@/api/system-settings'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildCustomerStatementDraftData,
  buildFreightStatementDraftData,
  buildSupplierStatementDraftData,
  getCustomerStatementSelectionError,
  getFreightStatementSelectionError,
  getSupplierStatementSelectionError,
} from './module-adapter-statements'
import { buildModuleLineItemId } from './module-adapter-editor'
import { cloneLineItems } from '@/utils/clone-utils'

export interface FreightSummaryRow {
  id: string
  carrierName: string
  statementCount: number
  totalWeight: number
  totalFreight: number
  paidAmount: number
  unpaidAmount: number
}

interface UseStatementGeneratorSupportOptions {
  canViewRecords: Ref<boolean>
  moduleKey: Ref<string>
  submittedFilters: Ref<Record<string, unknown>>
  defaultPageSize: Ref<number>
  createBaseDraft: () => ModuleRecord
  openEditorWithDraft: (draft: ModuleRecord) => void
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

interface CandidateGeneratorState {
  visible: Ref<boolean>
  loading: Ref<boolean>
  rows: Ref<ModuleRecord[]>
  keyword: Ref<string>
  currentPage: Ref<number>
  pageSize: Ref<number>
  total: Ref<number>
  selectedKeys: Ref<string[]>
  selectedRowMap: Ref<Record<string, ModuleRecord>>
}

interface CandidateLoaderOptions {
  keyword: string
  currentPage: number
  pageSize: number
}

interface CandidatePageResult {
  rows: ModuleRecord[]
  total: number
}

function isModuleRecord(record: ModuleRecord | undefined): record is ModuleRecord {
  return Boolean(record)
}

async function loadStatementGeneratorRules() {
  return getStatementGeneratorRules()
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

function createCandidateGeneratorState(defaultPageSize: number): CandidateGeneratorState {
  return {
    visible: ref(false),
    loading: ref(false),
    rows: ref<ModuleRecord[]>([]),
    keyword: ref(''),
    currentPage: ref(1),
    pageSize: ref(defaultPageSize),
    total: ref(0),
    selectedKeys: ref<string[]>([]),
    selectedRowMap: ref<Record<string, ModuleRecord>>({}),
  }
}

function resetCandidateGeneratorState(state: CandidateGeneratorState, defaultPageSize: number) {
  state.loading.value = false
  state.rows.value = []
  state.keyword.value = ''
  state.currentPage.value = 1
  state.pageSize.value = defaultPageSize
  state.total.value = 0
  state.selectedKeys.value = []
  state.selectedRowMap.value = {}
}

function syncPagedSelection(
  state: CandidateGeneratorState,
  keys: Array<string | number>,
  rows: ModuleRecord[],
) {
  const visibleRowMap = Object.fromEntries(
    rows.map((record) => [String(record.id || ''), record]),
  )
  const visibleRowKeySet = new Set(Object.keys(visibleRowMap))
  const nextVisibleKeys = keys
    .map((key) => String(key))
    .filter((key) => visibleRowKeySet.has(key))

  const preservedKeys = state.selectedKeys.value.filter((key) => !visibleRowKeySet.has(key))
  state.selectedKeys.value = [...preservedKeys, ...nextVisibleKeys]

  const nextSelectedRowMap = { ...state.selectedRowMap.value }
  for (const visibleKey of visibleRowKeySet) {
    delete nextSelectedRowMap[visibleKey]
  }
  for (const key of nextVisibleKeys) {
    const record = visibleRowMap[key]
    if (record) {
      nextSelectedRowMap[key] = record
    }
  }
  state.selectedRowMap.value = nextSelectedRowMap
}

async function updateCandidateGeneratorKeyword(
  state: CandidateGeneratorState,
  value: string,
  reload: () => Promise<void>,
) {
  if (state.keyword.value === value) {
    return
  }
  state.keyword.value = value
  state.currentPage.value = 1
  await reload()
}

async function updateCandidateGeneratorCurrentPage(
  state: CandidateGeneratorState,
  value: number,
  reload: () => Promise<void>,
) {
  if (state.currentPage.value === value) {
    return
  }
  state.currentPage.value = value
  await reload()
}

async function updateCandidateGeneratorPageSize(
  state: CandidateGeneratorState,
  value: number,
  reload: () => Promise<void>,
) {
  if (state.pageSize.value === value) {
    return
  }
  state.pageSize.value = value
  state.currentPage.value = 1
  await reload()
}

export function useStatementGeneratorSupport(options: UseStatementGeneratorSupportOptions) {
  const supplierState = createCandidateGeneratorState(options.defaultPageSize.value)
  const customerState = createCandidateGeneratorState(options.defaultPageSize.value)
  const freightState = createCandidateGeneratorState(options.defaultPageSize.value)
  const supplierRequestToken = ref(0)
  const customerRequestToken = ref(0)
  const freightRequestToken = ref(0)

  const freightSummaryVisible = ref(false)
  const freightSummaryLoading = ref(false)
  const freightSummaryRows = ref<FreightSummaryRow[]>([])

  const supplierStatementSelectedInbounds = computed(() =>
    supplierState.selectedKeys.value
      .map((key) => supplierState.selectedRowMap.value[key])
      .filter(isModuleRecord),
  )
  const supplierStatementSelectedSupplierName = computed(() =>
    String(supplierStatementSelectedInbounds.value[0]?.supplierName || ''),
  )
  const supplierStatementRowSelection = computed(() => ({
    selectedRowKeys: supplierState.selectedKeys.value,
    onChange: (keys: Array<string | number>, rows: ModuleRecord[]) => {
      syncPagedSelection(supplierState, keys, rows)
    },
    getCheckboxProps: (record: ModuleRecord) => ({
      disabled: Boolean(
        supplierStatementSelectedSupplierName.value
        && supplierStatementSelectedSupplierName.value !== String(record.supplierName || ''),
      ),
    }),
  }))

  const customerStatementSelectedOrders = computed(() =>
    customerState.selectedKeys.value
      .map((key) => customerState.selectedRowMap.value[key])
      .filter(isModuleRecord),
  )
  const customerStatementSelectedCustomerName = computed(() =>
    String(customerStatementSelectedOrders.value[0]?.customerName || ''),
  )
  const customerStatementSelectedProjectName = computed(() =>
    String(customerStatementSelectedOrders.value[0]?.projectName || ''),
  )
  const customerStatementRowSelection = computed(() => ({
    selectedRowKeys: customerState.selectedKeys.value,
    onChange: (keys: Array<string | number>, rows: ModuleRecord[]) => {
      syncPagedSelection(customerState, keys, rows)
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
    freightState.selectedKeys.value
      .map((key) => freightState.selectedRowMap.value[key])
      .filter(isModuleRecord),
  )
  const freightStatementSelectedCarrierName = computed(() =>
    String(freightStatementSelectedBills.value[0]?.carrierName || ''),
  )
  const freightStatementRowSelection = computed(() => ({
    selectedRowKeys: freightState.selectedKeys.value,
    onChange: (keys: Array<string | number>, rows: ModuleRecord[]) => {
      syncPagedSelection(freightState, keys, rows)
    },
    getCheckboxProps: (record: ModuleRecord) => ({
      disabled: Boolean(
        freightStatementSelectedCarrierName.value
        && freightStatementSelectedCarrierName.value !== String(record.carrierName || ''),
      ),
    }),
  }))

  function closeSupplierStatementGenerator() {
    supplierState.visible.value = false
    resetCandidateGeneratorState(supplierState, options.defaultPageSize.value)
  }

  function closeCustomerStatementGenerator() {
    customerState.visible.value = false
    resetCandidateGeneratorState(customerState, options.defaultPageSize.value)
  }

  function closeFreightStatementGenerator() {
    freightState.visible.value = false
    resetCandidateGeneratorState(freightState, options.defaultPageSize.value)
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

  async function loadCandidatePage(
    state: CandidateGeneratorState,
    requestToken: Ref<number>,
    loader: (options: CandidateLoaderOptions) => Promise<CandidatePageResult>,
    emptyMessage: string,
    fallbackMessage: string,
    onError: () => void,
  ) {
    if (!state.visible.value) {
      return
    }

    const nextToken = requestToken.value + 1
    requestToken.value = nextToken
    state.loading.value = true

    try {
      const result = await loader({
        keyword: state.keyword.value.trim(),
        currentPage: state.currentPage.value,
        pageSize: state.pageSize.value,
      })
      if (requestToken.value !== nextToken) {
        return
      }

      state.rows.value = result.rows
      state.total.value = result.total

      if (!result.rows.length && !state.selectedKeys.value.length && state.currentPage.value === 1) {
        message.warning(emptyMessage)
      }
    } catch (error) {
      if (requestToken.value !== nextToken) {
        return
      }
      options.showRequestError(error, fallbackMessage)
      onError()
    } finally {
      if (requestToken.value === nextToken) {
        state.loading.value = false
      }
    }
  }

  async function reloadSupplierStatementCandidates() {
    await loadCandidatePage(
      supplierState,
      supplierRequestToken,
      ({ keyword, currentPage, pageSize }) =>
        listSupplierStatementCandidates(keyword, { currentPage, pageSize }),
      '没有可生成对账单的采购入库单',
      '采购入库单加载失败',
      closeSupplierStatementGenerator,
    )
  }

  async function reloadCustomerStatementCandidates() {
    await loadCandidatePage(
      customerState,
      customerRequestToken,
      ({ keyword, currentPage, pageSize }) =>
        listCustomerStatementCandidates(keyword, { currentPage, pageSize }),
      '没有可生成对账单的销售订单',
      '销售订单加载失败',
      closeCustomerStatementGenerator,
    )
  }

  async function reloadFreightStatementCandidates() {
    await loadCandidatePage(
      freightState,
      freightRequestToken,
      ({ keyword, currentPage, pageSize }) =>
        listFreightStatementCandidates(keyword, { currentPage, pageSize }),
      '没有可生成对账单的物流单',
      '物流单加载失败',
      closeFreightStatementGenerator,
    )
  }

  async function openSupplierStatementGenerator() {
    resetCandidateGeneratorState(supplierState, options.defaultPageSize.value)
    supplierState.visible.value = true
    await reloadSupplierStatementCandidates()
  }

  async function openCustomerStatementGenerator() {
    resetCandidateGeneratorState(customerState, options.defaultPageSize.value)
    customerState.visible.value = true
    await reloadCustomerStatementCandidates()
  }

  async function openFreightStatementGenerator() {
    resetCandidateGeneratorState(freightState, options.defaultPageSize.value)
    freightState.visible.value = true
    await reloadFreightStatementCandidates()
  }

  async function updateSupplierStatementKeyword(value: string) {
    await updateCandidateGeneratorKeyword(supplierState, value, reloadSupplierStatementCandidates)
  }

  async function updateSupplierStatementCurrentPage(value: number) {
    await updateCandidateGeneratorCurrentPage(supplierState, value, reloadSupplierStatementCandidates)
  }

  async function updateSupplierStatementPageSize(value: number) {
    await updateCandidateGeneratorPageSize(supplierState, value, reloadSupplierStatementCandidates)
  }

  async function updateCustomerStatementKeyword(value: string) {
    await updateCandidateGeneratorKeyword(customerState, value, reloadCustomerStatementCandidates)
  }

  async function updateCustomerStatementCurrentPage(value: number) {
    await updateCandidateGeneratorCurrentPage(customerState, value, reloadCustomerStatementCandidates)
  }

  async function updateCustomerStatementPageSize(value: number) {
    await updateCandidateGeneratorPageSize(customerState, value, reloadCustomerStatementCandidates)
  }

  async function updateFreightStatementKeyword(value: string) {
    await updateCandidateGeneratorKeyword(freightState, value, reloadFreightStatementCandidates)
  }

  async function updateFreightStatementCurrentPage(value: number) {
    await updateCandidateGeneratorCurrentPage(freightState, value, reloadFreightStatementCandidates)
  }

  async function updateFreightStatementPageSize(value: number) {
    await updateCandidateGeneratorPageSize(freightState, value, reloadFreightStatementCandidates)
  }

  async function buildSupplierStatementDraft(sourceInbounds: ModuleRecord[]) {
    const detailedInbounds = await hydrateModuleDetails('purchase-inbounds', sourceInbounds)
    const baseDraft = options.createBaseDraft()
    const statementGeneratorRules = await loadStatementGeneratorRules()
    return buildSupplierStatementDraftData({
      baseDraft,
      sourceInbounds: detailedInbounds,
      today: dayjs().format('YYYY-MM-DD'),
      defaultFullPayment: statementGeneratorRules.supplierStatementFullPayment,
      cloneLineItems,
      buildLineItemId: buildModuleLineItemId,
    })
  }

  async function buildCustomerStatementDraft(sourceOrders: ModuleRecord[]) {
    const detailedOrders = await hydrateModuleDetails('sales-orders', sourceOrders)
    const statementGeneratorRules = await loadStatementGeneratorRules()
    return buildCustomerStatementDraftData({
      baseDraft: options.createBaseDraft(),
      sourceOrders: detailedOrders,
      today: dayjs().format('YYYY-MM-DD'),
      defaultReceiptAmountZero: statementGeneratorRules.customerStatementReceiptAmountZero,
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
    customerStatementCandidateRows: customerState.rows,
    customerStatementCurrentPage: customerState.currentPage,
    customerStatementGeneratorLoading: customerState.loading,
    customerStatementGeneratorVisible: customerState.visible,
    customerStatementKeyword: customerState.keyword,
    customerStatementPageSize: customerState.pageSize,
    customerStatementRowSelection,
    customerStatementSelectedCustomerName,
    customerStatementSelectedOrders,
    customerStatementSelectedProjectName,
    customerStatementTotal: customerState.total,
    freightStatementCandidateRows: freightState.rows,
    freightStatementCurrentPage: freightState.currentPage,
    freightStatementGeneratorLoading: freightState.loading,
    freightStatementGeneratorVisible: freightState.visible,
    freightStatementKeyword: freightState.keyword,
    freightStatementPageSize: freightState.pageSize,
    freightStatementRowSelection,
    freightStatementSelectedBills,
    freightStatementSelectedCarrierName,
    freightStatementTotal: freightState.total,
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
    supplierStatementCandidateRows: supplierState.rows,
    supplierStatementCurrentPage: supplierState.currentPage,
    supplierStatementGeneratorLoading: supplierState.loading,
    supplierStatementGeneratorVisible: supplierState.visible,
    supplierStatementKeyword: supplierState.keyword,
    supplierStatementPageSize: supplierState.pageSize,
    supplierStatementRowSelection,
    supplierStatementSelectedInbounds,
    supplierStatementSelectedSupplierName,
    supplierStatementTotal: supplierState.total,
    updateCustomerStatementCurrentPage,
    updateCustomerStatementKeyword,
    updateCustomerStatementPageSize,
    updateFreightStatementCurrentPage,
    updateFreightStatementKeyword,
    updateFreightStatementPageSize,
    updateSupplierStatementCurrentPage,
    updateSupplierStatementKeyword,
    updateSupplierStatementPageSize,
  }
}
