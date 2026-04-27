import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleLineItem, ModuleParentImportDefinition, ModuleRecord } from '@/types/module-page'
import { useParentImportSupport } from '@/views/modules/use-parent-import-support'

const { message } = vi.hoisted(() => ({
  message: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('ant-design-vue', () => ({
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  message,
}))

describe('use-parent-import-support', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates parent detail before importing items', async () => {
    const editorForm: Record<string, unknown> = { purchaseOrderNo: '', items: [] }
    const editorItems = ref<ModuleLineItem[]>([])
    const parentImportConfig = ref<ModuleParentImportDefinition | undefined>({
      parentModuleKey: 'purchase-orders',
      label: '上级采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
      mapParentToDraft: (parentRecord) => ({
        supplierName: parentRecord.supplierName || '',
      }),
      transformItems: (parentRecord) =>
        (Array.isArray(parentRecord.items) ? parentRecord.items : []) as ModuleLineItem[],
    })

    const fetchParentDetail = vi.fn(async () => ({
      id: 'po-1',
      orderNo: 'PO-001',
      supplierName: '供应商甲',
      items: [
        { id: 'item-1', materialCode: 'MAT-001', quantity: 1 },
      ],
    } satisfies ModuleRecord))

    const support = useParentImportSupport({
      editorForm,
      editorItems,
      editorSourceRecordId: ref(''),
      editorVisible: ref(true),
      parentImportConfig,
      parentRows: ref([
        { id: 'po-1', orderNo: 'PO-001', supplierName: '供应商甲' } satisfies ModuleRecord,
      ]),
      moduleRows: ref([]),
      cloneLineItems: (value) => JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[],
      fetchParentDetail,
    })

    support.selectedParentId.value = 'po-1'
    await support.handleImportParentItems()

    expect(fetchParentDetail).toHaveBeenCalledTimes(1)
    expect(editorForm.purchaseOrderNo).toBe('PO-001')
    expect(editorForm.supplierName).toBe('供应商甲')
    expect(Array.isArray(editorForm.items)).toBe(true)
    expect((editorForm.items as ModuleLineItem[])[0]).toMatchObject({
      materialCode: 'MAT-001',
      _parentRelationNo: 'PO-001',
    })
    expect(message.success).toHaveBeenCalledWith('上级采购订单明细已追加')
  })
})
