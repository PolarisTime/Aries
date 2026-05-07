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

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function buildParentSelectorState() {
  return {
    parentSelectorKeyword: ref(''),
    parentSelectorCurrentPage: ref(1),
    parentSelectorPageSize: ref(20),
    parentSelectorDefaultPageSize: ref(20),
  }
}

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
      ...buildParentSelectorState(),
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

  it('hides purchase order parents without importable remaining quantity and exposes importable quantity', async () => {
    const editorForm: Record<string, unknown> = { purchaseOrderNo: 'PO-003', items: [] }
    const editorItems = ref<ModuleLineItem[]>([
      {
        id: 'current-item',
        sourcePurchaseOrderItemId: 'po-item-3',
        quantity: 2,
        _parentRelationNo: 'PO-003',
      },
    ])
    const parentImportConfig = ref<ModuleParentImportDefinition | undefined>({
      parentModuleKey: 'purchase-orders',
      label: '上级采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
      transformItems: (parentRecord) =>
        (Array.isArray(parentRecord.items) ? parentRecord.items : []) as ModuleLineItem[],
    })

    const detailMap: Record<string, ModuleRecord> = {
      'po-1': {
        id: 'po-1',
        orderNo: 'PO-001',
        items: [{ id: 'po-item-1', remainingQuantity: 0, quantity: 10 }],
      },
      'po-2': {
        id: 'po-2',
        orderNo: 'PO-002',
        items: [{ id: 'po-item-2', remainingQuantity: 5, quantity: 10 }],
      },
      'po-3': {
        id: 'po-3',
        orderNo: 'PO-003',
        items: [{ id: 'po-item-3', remainingQuantity: 0, quantity: 10 }],
      },
    }
    const fetchParentDetail = vi.fn(async (record: ModuleRecord) => detailMap[String(record.id)])

    const support = useParentImportSupport({
      editorForm,
      editorItems,
      editorSourceRecordId: ref(''),
      editorVisible: ref(true),
      parentImportConfig,
      parentRows: ref([
        { id: 'po-1', orderNo: 'PO-001' },
        { id: 'po-2', orderNo: 'PO-002' },
        { id: 'po-3', orderNo: 'PO-003' },
      ]),
      moduleRows: ref([]),
      ...buildParentSelectorState(),
      cloneLineItems: (value) => JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[],
      fetchParentDetail,
    })

    support.openParentSelector()
    await flushPromises()
    await flushPromises()

    expect(fetchParentDetail).toHaveBeenCalledTimes(3)
    expect(support.parentSelectorRows.value.map((record) => record.orderNo)).toEqual(['PO-002', 'PO-003'])
    expect(support.getParentImportableQuantity({ id: 'po-2', orderNo: 'PO-002' })).toBe(5)
    expect(support.getParentImportableQuantity({ id: 'po-3', orderNo: 'PO-003' })).toBe(2)
  })

  it('hydrates purchase order availability when parent rows arrive after opening the selector', async () => {
    const parentRows = ref<ModuleRecord[]>([])
    const support = useParentImportSupport({
      editorForm: { purchaseOrderNo: '', items: [] },
      editorItems: ref<ModuleLineItem[]>([]),
      editorSourceRecordId: ref(''),
      editorVisible: ref(true),
      parentImportConfig: ref<ModuleParentImportDefinition | undefined>({
        parentModuleKey: 'purchase-orders',
        label: '上级采购订单',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        transformItems: (parentRecord) =>
          (Array.isArray(parentRecord.items) ? parentRecord.items : []) as ModuleLineItem[],
      }),
      parentRows,
      moduleRows: ref([]),
      ...buildParentSelectorState(),
      cloneLineItems: (value) => JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[],
      fetchParentDetail: vi.fn(async () => ({
        id: 'po-2',
        orderNo: 'PO-002',
        items: [{ id: 'po-item-2', remainingQuantity: 5, quantity: 10 }],
      })),
    })

    support.openParentSelector()
    parentRows.value = [{ id: 'po-2', orderNo: 'PO-002' }]
    await flushPromises()
    await flushPromises()

    expect(support.parentSelectorRows.value.map((record) => record.orderNo)).toEqual(['PO-002'])
    expect(support.getParentImportableQuantity({ id: 'po-2', orderNo: 'PO-002' })).toBe(5)
  })

  it('uses configured remaining quantity field when filtering purchase order parents', async () => {
    const support = useParentImportSupport({
      editorForm: { purchaseOrderNo: '', items: [] },
      editorItems: ref<ModuleLineItem[]>([]),
      editorSourceRecordId: ref(''),
      editorVisible: ref(true),
      parentImportConfig: ref<ModuleParentImportDefinition | undefined>({
        parentModuleKey: 'purchase-orders',
        label: '上级采购订单',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        remainingQuantityKey: 'salesRemainingQuantity',
        transformItems: (parentRecord) =>
          (Array.isArray(parentRecord.items) ? parentRecord.items : []) as ModuleLineItem[],
      }),
      parentRows: ref([
        {
          id: 'po-1',
          orderNo: 'PO-001',
          items: [{ id: 'po-item-1', remainingQuantity: 10, salesRemainingQuantity: 0, quantity: 10 }],
        },
        {
          id: 'po-2',
          orderNo: 'PO-002',
          items: [{ id: 'po-item-2', remainingQuantity: 0, salesRemainingQuantity: 3, quantity: 10 }],
        },
      ]),
      moduleRows: ref([]),
      ...buildParentSelectorState(),
      cloneLineItems: (value) => JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[],
    })

    expect(support.parentSelectorRows.value.map((record) => record.orderNo)).toEqual(['PO-002'])
    expect(support.getParentImportableQuantity(support.parentSelectorRows.value[0])).toBe(3)
  })

  it('uses remote importable quantity and skips detail hydration for purchase order candidate pages', async () => {
    const fetchParentDetail = vi.fn()
    const support = useParentImportSupport({
      editorForm: { purchaseOrderNo: 'PO-003', items: [] },
      editorItems: ref<ModuleLineItem[]>([
        {
          id: 'current-item',
          sourcePurchaseOrderItemId: 'po-item-3',
          quantity: 2,
          _parentRelationNo: 'PO-003',
        },
      ]),
      editorSourceRecordId: ref(''),
      editorVisible: ref(true),
      parentImportConfig: ref<ModuleParentImportDefinition | undefined>({
        parentModuleKey: 'purchase-orders',
        label: '上级采购订单',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        candidateQueryType: 'purchase-order-import',
        candidateUsage: 'sales-order',
        remainingQuantityKey: 'salesRemainingQuantity',
        transformItems: (parentRecord) =>
          (Array.isArray(parentRecord.items) ? parentRecord.items : []) as ModuleLineItem[],
      }),
      parentRows: ref([
        { id: 'po-1', orderNo: 'PO-001', importableQuantity: 0 },
        { id: 'po-2', orderNo: 'PO-002', importableQuantity: 5 },
        { id: 'po-3', orderNo: 'PO-003', importableQuantity: 0 },
      ]),
      moduleRows: ref([]),
      ...buildParentSelectorState(),
      cloneLineItems: (value) => JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[],
      fetchParentDetail,
    })

    await support.openParentSelector()
    await flushPromises()

    expect(fetchParentDetail).not.toHaveBeenCalled()
    expect(support.parentSelectorRows.value.map((record) => record.orderNo)).toEqual(['PO-001', 'PO-002', 'PO-003'])
    expect(support.getParentImportableQuantity(support.parentSelectorRows.value[1])).toBe(5)
    expect(support.getParentImportableQuantity(support.parentSelectorRows.value[2])).toBe(2)
    expect(support.parentSelectorRowSelection.value.getCheckboxProps?.(support.parentSelectorRows.value[0])).toEqual({ disabled: true })
    expect(support.parentSelectorRowSelection.value.getCheckboxProps?.(support.parentSelectorRows.value[1])).toEqual({ disabled: false })
  })
})
