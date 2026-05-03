import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useModulePageLifecycle } from '@/views/modules/use-module-page-lifecycle'
import type { ModuleRecord } from '@/types/module-page'

function createOptions(overrides: Partial<Parameters<typeof useModulePageLifecycle>[0]> = {}) {
  const selectedRowKeys = ref<string[]>([])
  const selectedRowMap = ref<Record<string, ModuleRecord>>({})
  const detailVisible = ref(false)
  const activeRecord = ref<ModuleRecord | null>(null)

  return {
    moduleKey: ref('purchase-orders'),
    routeDocNo: ref(''),
    routeTrackId: ref('1914876201459236001'),
    routeOpenDetail: ref('1'),
    listRows: ref<ModuleRecord[]>([]),
    selectedRowKeys,
    selectedRowMap,
    detailVisible,
    activeRecord,
    resetFilters: vi.fn(),
    setPaginationCurrentPage: vi.fn(),
    resetGridTableState: vi.fn(),
    closeFreightPickupList: vi.fn(),
    resetStatementSupportState: vi.fn(),
    closeMaterialImportModal: vi.fn(),
    resetUploadRuleState: vi.fn(),
    closeEditor: vi.fn(),
    initColumnSettings: vi.fn(),
    initFormFieldSettings: vi.fn(),
    initEditorColumnSettings: vi.fn(),
    applyKeywordFilter: vi.fn(),
    getPrimaryNo: (record: ModuleRecord) => String(record.orderNo || ''),
    fetchRecordById: vi.fn(async () => ({
      id: '1914876201459236001',
      orderNo: 'CG20260001',
    })),
    handleView: vi.fn(),
    ...overrides,
  }
}

describe('useModulePageLifecycle', () => {
  it('opens detail by trackId through detail lookup when the row is not on the current page', async () => {
    const options = createOptions()

    useModulePageLifecycle(options)
    await flushPromises()

    expect(options.applyKeywordFilter).toHaveBeenCalledWith('1914876201459236001')
    expect(options.fetchRecordById).toHaveBeenCalledWith('1914876201459236001')
    expect(options.handleView).toHaveBeenCalledWith({
      id: '1914876201459236001',
      orderNo: 'CG20260001',
    })
  })

  it('opens detail by trackId from list rows without a lookup when the row is already loaded', async () => {
    const row = {
      id: '1914876201459236001',
      orderNo: 'CG20260001',
    }
    const options = createOptions({
      listRows: ref<ModuleRecord[]>([row]),
    })

    useModulePageLifecycle(options)
    await flushPromises()

    expect(options.fetchRecordById).not.toHaveBeenCalled()
    expect(options.handleView).toHaveBeenCalledWith(row)
  })
})
