import dayjs from 'dayjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { serializeBusinessRecordForSave } from './module-save-payload'

const { getModulePageSchemaMock } = vi.hoisted(() => ({
  getModulePageSchemaMock: vi.fn(),
}))

vi.mock('@/config/module-page-schema', () => ({
  getModulePageSchema: getModulePageSchemaMock,
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: vi.fn(),
}))

vi.mock('@/module-system/module-behavior-registry', () => ({
  hasBehavior: vi.fn(),
  getBehaviorValue: vi.fn(),
}))

describe('module-save-payload', () => {
  beforeEach(async () => {
    getModulePageSchemaMock.mockReturnValue(undefined)
    vi.resetAllMocks()
    getModulePageSchemaMock.mockReturnValue(undefined)
    const mod = await import('./module-save-payload')
    // Access the module to ensure it's loaded
    void mod
  })

  it('keeps receipt scalar fields in save payload', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'receipt',
      detailFields: [
        { key: 'receiptNo', type: 'input', label: '单据编号' },
        { key: 'customerCode', type: 'input', label: '客户编码' },
        { key: 'customerName', type: 'input', label: '客户' },
        { key: 'projectName', type: 'input', label: '项目' },
        { key: 'settlementCompanyId', type: 'input', label: '结算主体' },
        { key: 'settlementCompanyName', type: 'input', label: '结算主体名称' },
        { key: 'sourceStatementId', type: 'input', label: '对账单' },
        { key: 'receiptDate', type: 'input', label: '日期' },
        { key: 'payType', type: 'input', label: '方式' },
        { key: 'amount', type: 'input', label: '金额' },
        { key: 'status', type: 'input', label: '状态' },
        { key: 'operatorName', type: 'input', label: '操作人' },
        { key: 'remark', type: 'input', label: '备注' },
        { key: 'totalAmount', type: 'input', label: '总计' },
      ],
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave('receipt', {
      id: '',
      receiptNo: 'RC20260001',
      customerCode: 'C-001',
      customerName: '测试客户',
      projectName: '测试项目',
      settlementCompanyId: 8,
      settlementCompanyName: '主体B',
      sourceStatementId: '308251467645452288',
      receiptDate: '2026-05-09',
      payType: '银行转账',
      amount: 123456.78,
      status: '已收款',
      operatorName: 'test9',
      remark: 'ok',
    })

    expect(payload).toMatchObject({
      receiptNo: 'RC20260001',
      customerCode: 'C-001',
      customerName: '测试客户',
      projectName: '测试项目',
      settlementCompanyId: 8,
      settlementCompanyName: '主体B',
      sourceStatementId: '308251467645452288',
      receiptDate: '2026-05-09',
      payType: '银行转账',
      status: '已收款',
      operatorName: 'test9',
      remark: 'ok',
    })
    expect(payload).not.toHaveProperty('totalAmount')
  })

  it('keeps payment scalar fields in save payload', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'payment',
      detailFields: [
        { key: 'paymentNo', type: 'input', label: '单据编号' },
        { key: 'businessType', type: 'input', label: '类型' },
        { key: 'counterpartyCode', type: 'input', label: '往来单位编码' },
        { key: 'counterpartyName', type: 'input', label: '对方' },
        { key: 'sourceStatementId', type: 'input', label: '对账单' },
        { key: 'paymentDate', type: 'input', label: '日期' },
        { key: 'payType', type: 'input', label: '方式' },
        { key: 'amount', type: 'input', label: '金额' },
        { key: 'status', type: 'input', label: '状态' },
        { key: 'operatorName', type: 'input', label: '操作人' },
        { key: 'remark', type: 'input', label: '备注' },
      ],
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave('payment', {
      id: '',
      paymentNo: 'FK20260001',
      businessType: '供应商',
      counterpartyCode: 'S-001',
      counterpartyName: '测试供应商',
      sourceStatementId: '308251467645452289',
      paymentDate: '2026-05-09',
      payType: '银行转账',
      amount: 654321.12,
      status: '已付款',
      operatorName: 'test9',
      remark: 'ok',
    })

    expect(payload).toMatchObject({
      paymentNo: 'FK20260001',
      businessType: '供应商',
      counterpartyCode: 'S-001',
      counterpartyName: '测试供应商',
      sourceStatementId: '308251467645452289',
      paymentDate: '2026-05-09',
      payType: '银行转账',
      status: '已付款',
      operatorName: 'test9',
      remark: 'ok',
    })
  })

  it('keeps sales order hidden scalar fields in save payload', async () => {
    getModulePageSchemaMock.mockReturnValue({
      saveFields: {
        scalar: [
          'orderNo',
          'purchaseInboundNo',
          'purchaseOrderNo',
          'customerCode',
          'customerName',
          'projectId',
          'projectName',
          'deliveryDate',
          'salesName',
          'status',
          'remark',
        ],
        lineItem: [
          'sourceInboundItemId',
          'sourcePurchaseOrderItemId',
          'materialCode',
          'warehouseName',
          'batchNo',
          'quantity',
          'unitPrice',
        ],
      },
    })
    const { hasBehavior } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(hasBehavior).mockImplementation(
      (_moduleKey, flag) => flag === 'savePayloadLineItems',
    )

    const payload = await serializeBusinessRecordForSave('sales-order', {
      id: '322056014486568960',
      orderNo: '322056014486568960',
      purchaseInboundNo: '',
      purchaseOrderNo: '322055806084186112',
      customerCode: '',
      customerName: '浙江景华建设有限公司',
      projectId: undefined,
      projectName: '海宁市袁花镇稻米加工口心项目',
      deliveryDate: dayjs('2026-06-07'),
      salesName: '沈李聪',
      status: '已审核',
      remark: '',
      items: [
        {
          id: '322056379525234688',
          sourcePurchaseOrderItemId: '322055940159307776',
          materialCode: '322052448292175872',
          warehouseName: '升华',
          batchNo: '2G339IW09NNK',
          quantity: 20,
          unitPrice: 3300,
        },
      ],
    })

    expect(payload).toMatchObject({
      orderNo: '322056014486568960',
      purchaseInboundNo: '',
      purchaseOrderNo: '322055806084186112',
      customerCode: '',
      customerName: '浙江景华建设有限公司',
      projectName: '海宁市袁花镇稻米加工口心项目',
      deliveryDate: '2026-06-07 00:00:00',
      salesName: '沈李聪',
      status: '已审核',
      remark: '',
      items: [
        {
          id: '322056379525234688',
          sourcePurchaseOrderItemId: '322055940159307776',
          materialCode: '322052448292175872',
          warehouseName: '升华',
          batchNo: '2G339IW09NNK',
          quantity: 20,
          unitPrice: 3300,
        },
      ],
    })
  })

  it('includes line items when behavior allows', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'purchase-inbound',
      detailFields: [{ key: 'inboundNo', type: 'input', label: '入库单号' }],
      saveFields: {
        scalar: ['inboundNo'],
        lineItem: ['materialCode', 'quantity', 'unitPrice', 'settlementMode'],
      },
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (key: string, behavior: string) => {
        if (key === 'purchase-inbound' && behavior === 'savePayloadLineItems')
          return true
        if (key === 'purchase-inbound' && behavior === 'includeAttachmentIds')
          return true
        return false
      },
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave('purchase-inbound', {
      id: '',
      inboundNo: 'RK20260001',
      items: [
        {
          id: '100',
          materialCode: 'M001',
          quantity: 10,
          unitPrice: 100,
          settlementMode: '理算',
        },
        {
          id: '101',
          materialCode: 'M002',
          quantity: 5,
          unitPrice: 200,
          settlementMode: '过磅',
        },
      ],
      attachmentIds: ['att-1', 'att-2'],
    })

    expect(payload).toHaveProperty('items')
    expect(payload.items).toHaveLength(2)
    expect(payload.items![0]).toMatchObject({
      id: '100',
      materialCode: 'M001',
      quantity: 10,
    })
    expect(payload).toHaveProperty('attachmentIds', ['att-1', 'att-2'])
  })

  it('includes attachmentIds when behavior allows', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'test-module',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => {
        if (behavior === 'includeAttachmentIds') return true
        return false
      },
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave('test-module', {
      id: '',
      name: 'test',
      attachmentIds: ['att-1'],
    })
    expect(payload).toHaveProperty('attachmentIds', ['att-1'])
  })

  it('handles dayjs values correctly', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'test',
      detailFields: [{ key: 'date', type: 'input', label: '日期' }],
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave('test', {
      id: '',
      date: dayjs('2026-06-01 12:00:00'),
    })
    expect(payload).toHaveProperty('date', '2026-06-01 12:00:00')
  })

  it('handles saveFields with computed fields from schema', async () => {
    getModulePageSchemaMock.mockReturnValue({
      saveFields: {
        scalar: ['name', 'totalAmount'],
        computed: ['totalAmount'],
        lineItem: ['materialCode'],
      },
    })

    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'computed-test',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave('computed-test', {
      id: '',
      name: 'test',
      totalAmount: 100,
    })
    expect(payload).toHaveProperty('name', 'test')
    expect(payload).not.toHaveProperty('totalAmount')
  })

  it('skips settlementMode for non-purchase-inbound modules', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'sales-order',
      detailFields: [{ key: 'orderNo', type: 'input', label: '订单号' }],
      saveFields: {
        scalar: ['orderNo'],
        lineItem: ['materialCode', 'settlementMode'],
      },
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => {
        if (behavior === 'savePayloadLineItems') return true
        return false
      },
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave('sales-order', {
      id: '',
      orderNo: 'SO001',
      items: [{ id: 'item-1', materialCode: 'M001', settlementMode: '过磅' }],
    })
    expect(payload.items![0]).not.toHaveProperty('settlementMode')
  })

  it('handles persisted line item id as number', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'test',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
      saveFields: { scalar: ['name'], lineItem: ['materialCode'] },
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => {
        if (behavior === 'savePayloadLineItems') return true
        return false
      },
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave('test', {
      id: '',
      name: 'test',
      items: [
        { id: 42 as any, materialCode: 'M001' },
        { id: 'abc', materialCode: 'M002' },
        { id: '123', materialCode: 'M003' },
        { id: -1 as any, materialCode: 'M004' },
      ],
    })
    expect(payload.items![0].id).toBe('42')
    expect(payload.items![1].id).toBeUndefined()
    expect(payload.items![2].id).toBe('123')
    expect(payload.items![3].id).toBeUndefined()
  })
})
