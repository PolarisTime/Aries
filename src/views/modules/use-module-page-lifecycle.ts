import { ref, watch, type Ref } from 'vue'
import type { ModuleRecord } from '@/types/module-page'

interface UseModulePageLifecycleOptions {
  moduleKey: Ref<string>
  routeDocNo: Ref<unknown>
  routeTrackId: Ref<unknown>
  routeOpenDetail: Ref<unknown>
  listRows: Ref<ModuleRecord[]>
  selectedRowKeys: Ref<string[]>
  selectedRowMap: Ref<Record<string, ModuleRecord>>
  detailVisible: Ref<boolean>
  activeRecord: Ref<ModuleRecord | null>
  resetFilters: () => void
  setPaginationCurrentPage: (value: number) => void
  resetGridTableState: () => void
  closeFreightPickupList: () => void
  resetStatementSupportState: () => void
  closeMaterialImportModal: () => void
  resetUploadRuleState: () => void
  closeEditor: () => void
  initColumnSettings: () => void
  initFormFieldSettings: () => void
  initEditorColumnSettings: () => void
  applyKeywordFilter: (keyword: string) => void
  getPrimaryNo: (record: ModuleRecord) => string
  fetchRecordById: (trackId: string) => Promise<ModuleRecord | null>
  handleView: (record: ModuleRecord) => unknown
}

export function useModulePageLifecycle(options: UseModulePageLifecycleOptions) {
  const autoOpenedRouteKey = ref('')

  function normalizeRouteValue(value: unknown) {
    return String(value || '').trim()
  }

  function resetPageState() {
    options.resetFilters()
    options.setPaginationCurrentPage(1)
    options.detailVisible.value = false
    options.activeRecord.value = null
    autoOpenedRouteKey.value = ''
    options.resetGridTableState()
    options.closeFreightPickupList()
    options.resetStatementSupportState()
    options.closeMaterialImportModal()
    options.resetUploadRuleState()
    options.closeEditor()
    options.initColumnSettings()
    options.initFormFieldSettings()
    options.initEditorColumnSettings()
  }

  function getRouteSearchKeyword() {
    return normalizeRouteValue(options.routeDocNo.value) || normalizeRouteValue(options.routeTrackId.value)
  }

  function applyRouteSearchKeyword() {
    options.applyKeywordFilter(getRouteSearchKeyword())
  }

  async function openRouteDetailFromRows(rows: ModuleRecord[]) {
    const openDetail = normalizeRouteValue(options.routeOpenDetail.value) === '1'
    if (!openDetail) {
      return
    }

    const trackId = normalizeRouteValue(options.routeTrackId.value)
    const docNo = normalizeRouteValue(options.routeDocNo.value)
    const routeKey = trackId ? `trackId:${trackId}` : docNo ? `docNo:${docNo}` : ''
    if (!routeKey || autoOpenedRouteKey.value === routeKey) {
      return
    }

    const matched = trackId
      ? rows.find((record) => String(record.id || '') === trackId)
      : rows.find((record) => options.getPrimaryNo(record) === docNo)
    if (matched) {
      autoOpenedRouteKey.value = routeKey
      void options.handleView(matched)
      return
    }

    if (trackId) {
      const record = await options.fetchRecordById(trackId)
      if (record) {
        autoOpenedRouteKey.value = routeKey
        void options.handleView(record)
      }
    }
  }

  watch(
    options.moduleKey,
    () => {
      resetPageState()
      applyRouteSearchKeyword()
    },
    { immediate: true },
  )

  watch(
    [options.routeDocNo, options.routeTrackId, options.routeOpenDetail],
    () => {
      autoOpenedRouteKey.value = ''
      applyRouteSearchKeyword()
      void openRouteDetailFromRows(options.listRows.value)
    },
  )

  watch(
    options.listRows,
    (rows) => {
      const nextMap = { ...options.selectedRowMap.value }
      rows.forEach((row) => {
        if (options.selectedRowKeys.value.includes(String(row.id))) {
          nextMap[String(row.id)] = row
        }
      })
      options.selectedRowMap.value = nextMap

      void openRouteDetailFromRows(rows)
    },
    { immediate: true },
  )

  return {
    handleReset: resetPageState,
    resetPageState,
  }
}
