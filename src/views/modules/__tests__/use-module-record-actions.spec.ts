import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useModuleRecordActions } from '@/views/modules/use-module-record-actions'

function createSupport() {
  return useModuleRecordActions({
    moduleKey: ref('sales-orders'),
    selectedRowKeys: ref([]),
    selectedRowMap: ref({}),
    expandedDetailRecordMap: ref({}),
    activeRecord: ref(null),
    attachmentRecord: ref(null),
    isReadOnly: ref(false),
    canEditRecords: ref(true),
    canDeleteRecords: ref(true),
    canAuditRecords: ref(true),
    canUseBulkDeleteActions: ref(true),
    listAuditTarget: ref({ key: 'status', value: '已审核' }),
    listReverseAuditTarget: ref({ key: 'status', value: '草稿' }),
    listStatusOptions: ref(['草稿', '已审核', '待完善', '完成销售']),
    getPrimaryNo: () => 'SO-001',
    handleCloseDetail: vi.fn(),
    closeAttachmentDialog: vi.fn(),
    printRecords: vi.fn(async () => {}),
    refreshModuleQueries: vi.fn(async () => {}),
    isSuccessCode: () => true,
    showRequestError: vi.fn(),
  })
}

describe('useModuleRecordActions', () => {
  it('blocks editing audited and completed records', () => {
    const support = createSupport()

    expect(support.canEditRecord({ id: '1', status: '已审核' })).toBe(false)
    expect(support.canEditRecord({ id: '2', status: '完成销售' })).toBe(false)
  })

  it('allows editing draft and pending-completion records when update permission exists', () => {
    const support = createSupport()

    expect(support.canEditRecord({ id: '1', status: '草稿' })).toBe(true)
    expect(support.canEditRecord({ id: '2', status: '待完善' })).toBe(true)
  })
})
