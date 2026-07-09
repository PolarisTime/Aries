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
      settlementCompanyId: '8',
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
      settlementCompanyId: '8',
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

  it('normalizes settlement company ids in save payload', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'customer',
      detailFields: [{ key: 'customerName', type: 'input', label: '客户' }],
      saveFields: {
        scalar: [
          'customerName',
          'settlementCompanyId',
          'settlementCompanyName',
          'defaultSettlementCompanyId',
          'defaultSettlementCompanyName',
        ],
        lineItem: [
          'materialCode',
          'settlementCompanyId',
          'settlementCompanyName',
        ],
      },
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => behavior === 'savePayloadLineItems',
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave('customer', {
      id: '',
      customerName: '客户A',
      settlementCompanyId: 8,
      settlementCompanyName: '主体A',
      defaultSettlementCompanyId: 9,
      defaultSettlementCompanyName: '主体B',
      items: [
        {
          id: '1',
          materialCode: 'M001',
          settlementCompanyId: 10,
          settlementCompanyName: '主体C',
        },
      ],
    })

    expect(payload).toMatchObject({
      settlementCompanyId: '8',
      defaultSettlementCompanyId: '9',
      items: [
        expect.objectContaining({
          settlementCompanyId: '10',
        }),
      ],
    })
  })

  it('drops blank settlement company ids after normalization', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'blank-settlement-company-test',
      saveFields: {
        scalar: ['settlementCompanyId'],
      },
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave(
      'blank-settlement-company-test',
      {
        id: '',
        settlementCompanyId: '   ',
      },
    )

    expect(payload).toEqual({ settlementCompanyId: undefined })
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
          'settlementCompanyId',
          'settlementCompanyName',
          'deliveryDate',
          'salesName',
          'status',
          'remark',
        ],
        lineItem: [
          'sourceInboundItemId',
          'sourcePurchaseOrderItemId',
          'settlementCompanyId',
          'settlementCompanyName',
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

  it('normalizes schema line item numeric fields before saving', async () => {
    getModulePageSchemaMock.mockReturnValue({
      saveFields: {
        scalar: ['orderNo'],
        lineItem: ['quantity', 'unitPrice'],
      },
    })
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => behavior === 'savePayloadLineItems',
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave(
      'schema-numeric-test',
      {
        id: '',
        orderNo: 'SO-NUMERIC',
        items: [{ id: '1', quantity: '', unitPrice: '12.50' }],
      },
    )

    expect(payload.items).toEqual([{ id: '1', quantity: 0, unitPrice: 12.5 }])
  })

  it('omits non-persisted reference ids from line items', async () => {
    getModulePageSchemaMock.mockReturnValue({
      saveFields: {
        scalar: ['orderNo'],
        lineItem: ['sourcePurchaseOrderItemId', 'materialCode'],
      },
    })
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => behavior === 'savePayloadLineItems',
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const payload = await serializeBusinessRecordForSave(
      'schema-reference-test',
      {
        id: '',
        orderNo: 'PO-ID',
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '8c4790f2f6b1aa44dc371b5ce155c7e3',
            materialCode: 'M001',
          },
        ],
      },
    )

    expect(payload.items![0]).toEqual({ id: '1', materialCode: 'M001' })
  })

  it('keeps settlement company fields for purchase order, sales order and freight bill', async () => {
    const { getModulePageSchema } = await vi.importActual<
      typeof import('@/config/module-page-schema')
    >('@/config/module-page-schema')
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    getModulePageSchemaMock.mockImplementation((moduleKey: string) =>
      getModulePageSchema(moduleKey),
    )
    vi.mocked(hasBehavior).mockImplementation(
      (_moduleKey, flag) => flag === 'savePayloadLineItems',
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    const baseRecord = {
      id: '',
      settlementCompanyId: 9,
      settlementCompanyName: 'TEST9',
      items: [],
    }

    await expect(
      serializeBusinessRecordForSave('purchase-order', {
        ...baseRecord,
        orderNo: 'PO-TEST9',
        supplierName: '供应商A',
        orderDate: dayjs('2026-06-01'),
        buyerName: '李四',
        status: '草稿',
      }),
    ).resolves.toMatchObject({
      settlementCompanyId: '9',
      settlementCompanyName: 'TEST9',
    })

    await expect(
      serializeBusinessRecordForSave('sales-order', {
        ...baseRecord,
        orderNo: 'SO-TEST9',
        customerName: '客户A',
        projectName: '项目A',
        deliveryDate: dayjs('2026-06-01'),
        salesName: '张三',
        status: '草稿',
      }),
    ).resolves.toMatchObject({
      settlementCompanyId: '9',
      settlementCompanyName: 'TEST9',
    })

    await expect(
      serializeBusinessRecordForSave('freight-bill', {
        ...baseRecord,
        billNo: 'FB-TEST9',
        carrierName: '物流甲',
        vehiclePlate: '浙A12345',
        customerName: '客户A',
        projectName: '项目A',
        billTime: dayjs('2026-06-01'),
        unitPrice: 20,
        status: '未审核',
      }),
    ).resolves.toMatchObject({
      settlementCompanyId: '9',
      settlementCompanyName: 'TEST9',
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

  it('rejects invalid dayjs values before sending them to the backend', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'test',
      detailFields: [{ key: 'date', type: 'input', label: '日期' }],
    } as ModulePageConfig)

    await expect(
      serializeBusinessRecordForSave('test', {
        id: '',
        date: dayjs('invalid-date'),
      }),
    ).rejects.toThrow('date 日期格式不合法')
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

  it('falls back to an empty scalar list when schema saveFields omit scalar fields', async () => {
    getModulePageSchemaMock.mockReturnValue({
      saveFields: {
        computed: ['totalAmount'],
      },
    })

    const payload = await serializeBusinessRecordForSave(
      'schema-empty-scalar-test',
      {
        id: '',
        name: 'test',
        totalAmount: 100,
      },
    )

    expect(payload).toEqual({})
  })

  it('falls back to an empty scalar list when config saveFields omit scalar fields', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'config-empty-scalar-test',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
      saveFields: {
        computed: ['totalAmount'],
      },
    } as ModulePageConfig)

    const payload = await serializeBusinessRecordForSave(
      'config-empty-scalar-test',
      {
        id: '',
        name: 'test',
        totalAmount: 100,
      },
    )

    expect(payload).toEqual({})
  })

  it('returns an empty payload when business page config cannot be loaded', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockRejectedValueOnce(
      new Error('load failed'),
    )

    await expect(
      serializeBusinessRecordForSave('config-load-failure-test', {
        id: '',
        name: 'test',
      }),
    ).resolves.toEqual({})
  })

  it('uses detail fields and extra scalar fields when saveFields are absent', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'detail-extra-test',
      detailFields: [
        { key: 'name', type: 'input', label: '名称' },
        { key: 'totalWeight', type: 'input', label: '合计' },
      ],
    } as ModulePageConfig)
    vi.mocked(getBehaviorValue).mockReturnValue(['extraName'])

    const payload = await serializeBusinessRecordForSave('detail-extra-test', {
      id: '',
      name: 'test',
      totalWeight: 10,
      extraName: 'extra',
    })

    expect(payload).toEqual({ name: 'test', extraName: 'extra' })

    await serializeBusinessRecordForSave('detail-extra-test', {
      id: '',
      name: 'cached',
      extraName: 'cached-extra',
    })
    expect(loadBusinessPageConfig).toHaveBeenCalledTimes(1)
  })

  it('handles configs without detail fields when saveFields are absent', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'no-detail-fields-test',
    } as ModulePageConfig)
    vi.mocked(getBehaviorValue).mockReturnValue([])

    await expect(
      serializeBusinessRecordForSave('no-detail-fields-test', {
        id: '',
        name: 'test',
      }),
    ).resolves.toEqual({})
  })

  it('skips development-only dropped-field warnings outside dev mode', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const { serializeBusinessRecordForSave: serializeWithoutDevWarnings } =
      await import('./module-save-payload')
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'non-dev-warning-test',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
    } as ModulePageConfig)

    await expect(
      serializeWithoutDevWarnings('non-dev-warning-test', {
        id: '',
        name: 'test',
        dropped: 'ignored',
      }),
    ).resolves.toEqual({ name: 'test' })
  })

  it('skips settlementMode for non-purchase-inbound modules', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'non-inbound-test',
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

    const payload = await serializeBusinessRecordForSave('non-inbound-test', {
      id: '',
      orderNo: 'SO001',
      items: [{ id: 'item-1', materialCode: 'M001', settlementMode: '过磅' }],
    })
    expect(payload.items![0]).not.toHaveProperty('settlementMode')
  })

  it('serializes missing line items and empty numeric values with defaults', async () => {
    const { loadBusinessPageConfig } = await import(
      '@/config/business-page-loader'
    )
    const { hasBehavior, getBehaviorValue } = await import(
      '@/module-system/module-behavior-registry'
    )
    vi.mocked(loadBusinessPageConfig).mockResolvedValue({
      key: 'line-item-default-test',
      detailFields: [{ key: 'name', type: 'input', label: '名称' }],
      saveFields: {
        scalar: ['name'],
        lineItem: ['quantity'],
      },
    } as ModulePageConfig)
    vi.mocked(hasBehavior).mockImplementation(
      (_key: string, behavior: string) => behavior === 'savePayloadLineItems',
    )
    vi.mocked(getBehaviorValue).mockReturnValue([])

    await expect(
      serializeBusinessRecordForSave('line-item-default-test', {
        id: '',
        name: 'without-items',
      }),
    ).resolves.toMatchObject({ items: [] })

    await expect(
      serializeBusinessRecordForSave('line-item-default-test', {
        id: '',
        name: 'with-empty-quantity',
        items: [{ id: '1', quantity: '' }],
      }),
    ).resolves.toMatchObject({ items: [{ id: '1', quantity: 0 }] })
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
