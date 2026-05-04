const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  restDelete: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
    post: clientMocks.httpPost,
    put: clientMocks.httpPut,
  },
  assertApiSuccess: <T extends { code?: number; message?: string }>(response: T) => {
    if (response.code != null && response.code !== 0) {
      throw new Error(response.message || '请求失败')
    }
    return response
  },
  restDelete: clientMocks.restDelete,
}))

describe('business api read-only modules', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPost.mockReset()
    clientMocks.httpPut.mockReset()
    clientMocks.restDelete.mockReset()
  })

  it('blocks permission-management detail/save/delete calls at the api layer', async () => {
    const {
      deleteBusinessModule,
      getBusinessModuleDetail,
      saveBusinessModule,
    } = await import('@/api/business')

    await expect(
      getBusinessModuleDetail('permission-management', '1'),
    ).rejects.toThrow('当前模块不支持详情接口')
    await expect(
      saveBusinessModule('permission-management', {
        id: '1',
        permissionCode: 'PERM_VIEW',
      }),
    ).rejects.toThrow('当前模块不支持保存')
    await expect(
      deleteBusinessModule('permission-management', '1'),
    ).rejects.toThrow('当前模块不支持删除')

    expect(clientMocks.httpGet).not.toHaveBeenCalled()
    expect(clientMocks.httpPost).not.toHaveBeenCalled()
    expect(clientMocks.httpPut).not.toHaveBeenCalled()
    expect(clientMocks.restDelete).not.toHaveBeenCalled()
  })

  it('keeps attachment binding ids as strings to avoid long integer precision loss', async () => {
    clientMocks.httpPut.mockResolvedValue({
      code: 0,
      data: {
        moduleKey: 'sales-orders',
        recordId: '1914876201459236001',
        attachments: [],
      },
    })

    const { updateAttachmentBindings } = await import('@/api/business')

    await updateAttachmentBindings('sales-orders', '1914876201459236001', [
      '1914876201459236002',
      '1914876201459236003',
      'invalid',
      '0',
    ])

    expect(clientMocks.httpPut).toHaveBeenCalledWith('/attachments/bindings', {
      moduleKey: 'sales-orders',
      recordId: '1914876201459236001',
      attachmentIds: ['1914876201459236002', '1914876201459236003'],
    })
  })

  it('normalizes empty page upload rule responses to null', async () => {
    clientMocks.httpGet.mockResolvedValue(undefined)

    const { getPageUploadRule } = await import('@/api/business')

    await expect(getPageUploadRule('purchase-orders')).resolves.toBeNull()
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/general-settings/upload-rule', {
      params: {
        moduleKey: 'purchase-orders',
      },
    })
  })

  it('saves invoice modules with source order summaries and line item payloads', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {
        id: '1',
      },
    })

    const { saveBusinessModule } = await import('@/api/business')

    await saveBusinessModule('invoice-receipts', {
      id: '',
      receiveNo: 'SP0001',
      invoiceNo: 'INV-R-1',
      sourcePurchaseOrderNos: 'PO-1',
      supplierName: '供应商甲',
      invoiceTitle: '供应商甲',
      invoiceDate: '2026-04-25',
      invoiceType: '增值税专票',
      amount: 120,
      taxAmount: 10,
      status: '草稿',
      operatorName: '财务A',
      remark: '备注',
      items: [
        {
          id: 'line-1',
          sourceNo: 'PO-1',
          sourcePurchaseOrderItemId: '11',
          materialCode: 'MAT-1',
          brand: '宝钢',
          category: '板材',
          material: 'Q235',
          spec: '10',
          length: '6000',
          unit: '吨',
          warehouseName: '一号库',
          batchNo: 'B1',
          quantity: '2',
          quantityUnit: '件',
          pieceWeightTon: 1.25,
          piecesPerBundle: '0',
          weightTon: 2.5,
          unitPrice: 48,
          amount: 120,
        },
      ],
    })

    expect(clientMocks.httpPost).toHaveBeenCalledWith(
      '/invoice-receipts',
      expect.objectContaining({
        sourcePurchaseOrderNos: 'PO-1',
        invoiceTitle: '供应商甲',
        items: [
          expect.objectContaining({
            sourceNo: 'PO-1',
            sourcePurchaseOrderItemId: '11',
            warehouseName: '一号库',
          }),
        ],
      }),
    )

    clientMocks.httpPost.mockClear()

    await saveBusinessModule('invoice-issues', {
      id: '',
      issueNo: 'KP0001',
      invoiceNo: 'INV-I-1',
      sourceSalesOrderNos: 'SO-1',
      customerName: '客户甲',
      projectName: '项目A',
      invoiceDate: '2026-04-25',
      invoiceType: '增值税专票',
      amount: 220,
      taxAmount: 20,
      status: '草稿',
      operatorName: '财务B',
      remark: '备注',
      items: [
        {
          id: 'line-1',
          sourceNo: 'SO-1',
          sourceSalesOrderItemId: '21',
          materialCode: 'MAT-2',
          brand: '鞍钢',
          category: '卷板',
          material: 'Q355',
          spec: '12',
          length: '9000',
          unit: '吨',
          warehouseName: '二号库',
          batchNo: 'B2',
          quantity: 4,
          quantityUnit: '件',
          pieceWeightTon: 1.5,
          piecesPerBundle: 0,
          weightTon: 6,
          unitPrice: 36.67,
          amount: 220,
        },
      ],
    })

    expect(clientMocks.httpPost).toHaveBeenCalledWith(
      '/invoice-issues',
      expect.objectContaining({
        sourceSalesOrderNos: 'SO-1',
        items: [
          expect.objectContaining({
            sourceNo: 'SO-1',
            sourceSalesOrderItemId: '21',
            warehouseName: '二号库',
          }),
        ],
      }),
    )
  })

  it('saves purchase inbound settlement and warehouse at line level only', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {
        id: '1',
      },
    })

    const { saveBusinessModule } = await import('@/api/business')

    await saveBusinessModule('purchase-inbounds', {
      id: '',
      inboundNo: 'PI0001',
      purchaseOrderNo: 'PO-1',
      supplierName: '供应商甲',
      inboundDate: '2026-04-25',
      status: '草稿',
      remark: '',
      items: [
        {
          id: 'line-1',
          sourcePurchaseOrderItemId: '11',
          materialCode: 'MAT-1',
          brand: '宝钢',
          category: '盘螺',
          material: 'HRB400',
          spec: '10',
          length: '6000',
          unit: '吨',
          warehouseName: '一号库',
          settlementMode: '过磅',
          batchNo: 'B1',
          quantity: 2,
          quantityUnit: '件',
          pieceWeightTon: 1.25,
          piecesPerBundle: 0,
          weightTon: 2.55,
          weighWeightTon: 2.55,
          weightAdjustmentTon: 0.05,
          weightAdjustmentAmount: 200,
          unitPrice: 4000,
          amount: 10200,
        },
      ],
    })

    const payload = clientMocks.httpPost.mock.calls[0][1]
    expect(payload).not.toHaveProperty('warehouseName')
    expect(payload).not.toHaveProperty('settlementMode')
    expect(clientMocks.httpPost).toHaveBeenCalledWith(
      '/purchase-inbounds',
      expect.objectContaining({
        supplierName: '供应商甲',
        items: [
          expect.objectContaining({
            warehouseName: '一号库',
            settlementMode: '过磅',
            weighWeightTon: 2.55,
          }),
        ],
      }),
    )
  })

  it('saves sales outbound warehouse at line level only', async () => {
    clientMocks.httpPost.mockResolvedValue({
      code: 0,
      data: {
        id: '1',
      },
    })

    const { saveBusinessModule } = await import('@/api/business')

    await saveBusinessModule('sales-outbounds', {
      id: '',
      outboundNo: 'SOO0001',
      salesOrderNo: 'SO-1',
      customerName: '客户甲',
      projectName: '项目A',
      warehouseName: '表头仓库',
      outboundDate: '2026-04-25',
      status: '草稿',
      remark: '',
      items: [
        {
          id: 'line-1',
          materialCode: 'MAT-1',
          brand: '宝钢',
          category: '盘螺',
          material: 'HRB400',
          spec: '10',
          length: '6000',
          unit: '吨',
          warehouseName: '一号码头',
          batchNo: 'B1',
          quantity: 2,
          quantityUnit: '件',
          pieceWeightTon: 1.25,
          piecesPerBundle: 0,
          weightTon: 2.5,
          unitPrice: 4000,
          amount: 10000,
        },
      ],
    })

    const payload = clientMocks.httpPost.mock.calls[0][1]
    expect(payload).not.toHaveProperty('warehouseName')
    expect(clientMocks.httpPost).toHaveBeenCalledWith(
      '/sales-outbounds',
      expect.objectContaining({
        customerName: '客户甲',
        items: [
          expect.objectContaining({
            warehouseName: '一号码头',
          }),
        ],
      }),
    )
  })

  it('serializes persisted line-item ids only for existing rows', async () => {
    clientMocks.httpPut.mockResolvedValue({
      code: 0,
      data: {
        id: '1',
      },
    })

    const { saveBusinessModule } = await import('@/api/business')

    await saveBusinessModule('purchase-orders', {
      id: '1',
      orderNo: 'PO-1',
      supplierName: '供应商甲',
      orderDate: '2026-04-25',
      buyerName: '采购A',
      status: '草稿',
      remark: '',
      items: [
        {
          id: '1914876201459236001',
          materialCode: 'MAT-1',
          brand: '宝钢',
          category: '板材',
          material: 'Q235',
          spec: '10',
          length: '6000',
          unit: '吨',
          warehouseName: '一号库',
          batchNo: 'B1',
          quantity: 2,
          quantityUnit: '件',
          pieceWeightTon: 1.25,
          piecesPerBundle: 0,
          weightTon: 2.5,
          unitPrice: 48,
          amount: 120,
        },
        {
          id: 'purchase-order-item-local-1',
          materialCode: 'MAT-2',
          brand: '鞍钢',
          category: '卷板',
          material: 'Q355',
          spec: '12',
          length: '9000',
          unit: '吨',
          warehouseName: '二号库',
          batchNo: 'B2',
          quantity: 4,
          quantityUnit: '件',
          pieceWeightTon: 1.5,
          piecesPerBundle: 0,
          weightTon: 6,
          unitPrice: 36.67,
          amount: 220,
        },
      ],
    })

    expect(clientMocks.httpPut).toHaveBeenCalledWith(
      '/purchase-orders/1',
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: '1914876201459236001',
          }),
          expect.not.objectContaining({
            id: expect.anything(),
          }),
        ],
      }),
    )
  })

  it('passes user account status filters through to the backend instead of client-side scanning', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'user-accounts',
      {
        keyword: 'admin',
        status: '禁用',
      },
      {
        currentPage: 2,
        pageSize: 10,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenCalledTimes(1)
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/user-accounts', {
      params: {
        keyword: 'admin',
        status: '禁用',
        page: 1,
        size: 10,
      },
    })
  })

  it('maps operation log date ranges to backend params without switching to client-side filtering', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'operation-logs',
      {
        keyword: 'admin',
        operationTime: ['2026-04-01', '2026-04-25'],
      },
      {
        currentPage: 3,
        pageSize: 20,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenCalledTimes(1)
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/operation-logs', {
      params: {
        keyword: 'admin',
        startTime: '2026-04-01',
        endTime: '2026-04-25',
        page: 2,
        size: 20,
      },
    })
  })

  it('maps io report date ranges to backend params without full table scans', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'io-report',
      {
        businessType: '采购入库',
        businessDate: ['2026-04-01', '2026-04-25'],
      },
      {
        currentPage: 1,
        pageSize: 50,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenCalledTimes(1)
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/io-report', {
      params: {
        businessType: '采购入库',
        startDate: '2026-04-01',
        endDate: '2026-04-25',
        page: 0,
        size: 50,
      },
    })
  })

  it('passes master data and system status filters straight through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'suppliers',
      {
        keyword: '钢',
        status: '正常',
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'general-settings',
      {
        status: '禁用',
      },
      {
        currentPage: 2,
        pageSize: 10,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(1, '/suppliers', {
      params: {
        keyword: '钢',
        status: '正常',
        page: 0,
        size: 20,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(
      2,
      '/general-settings',
      {
        params: {
          status: '禁用',
          page: 1,
          size: 10,
        },
      },
    )
  })

  it('passes material and warehouse-specific filters through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'materials',
      {
        keyword: 'HRB400',
        category: '螺纹钢',
        material: 'HRB400',
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'warehouses',
      {
        warehouseType: '合作仓',
        status: '正常',
      },
      {
        currentPage: 4,
        pageSize: 25,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(1, '/materials', {
      params: {
        keyword: 'HRB400',
        category: '螺纹钢',
        material: 'HRB400',
        page: 0,
        size: 20,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(2, '/warehouses', {
      params: {
        warehouseType: '合作仓',
        status: '正常',
        page: 3,
        size: 25,
      },
    })
  })

  it('passes statement filters and date ranges through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'supplier-statements',
      {
        supplierName: '供应商甲',
        status: '待确认',
        endDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'freight-statements',
      {
        carrierName: '物流甲',
        status: '已审核',
        signStatus: '已签署',
        endDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 2,
        pageSize: 15,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(
      1,
      '/supplier-statements',
      {
        params: {
          supplierName: '供应商甲',
          status: '待确认',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          page: 0,
          size: 20,
        },
      },
    )
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(
      2,
      '/freight-statements',
      {
        params: {
          carrierName: '物流甲',
          status: '已审核',
          signStatus: '已签署',
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
          page: 1,
          size: 15,
        },
      },
    )
  })

  it('passes operation document filters and date ranges through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'purchase-orders',
      {
        supplierName: '供应商甲',
        status: '已审核',
        orderDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'sales-orders',
      {
        customerName: '客户甲',
        projectName: '项目A',
        status: '完成销售',
        deliveryDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 2,
        pageSize: 10,
      },
    )

    await listBusinessModule(
      'sales-outbounds',
      {
        customerName: '客户甲',
        projectName: '项目A',
        status: '已审核',
        outboundDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 2,
        pageSize: 10,
      },
    )

    await listBusinessModule(
      'freight-bills',
      {
        carrierName: '物流甲',
        status: '已审核',
        billTime: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 3,
        pageSize: 15,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(1, '/purchase-orders', {
      params: {
        supplierName: '供应商甲',
        status: '已审核',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 0,
        size: 20,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(2, '/sales-orders', {
      params: {
        customerName: '客户甲',
        projectName: '项目A',
        status: '完成销售',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 1,
        size: 10,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(3, '/sales-outbounds', {
      params: {
        customerName: '客户甲',
        projectName: '项目A',
        status: '已审核',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 1,
        size: 10,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(4, '/freight-bills', {
      params: {
        carrierName: '物流甲',
        status: '已审核',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 2,
        size: 15,
      },
    })
  })

  it('passes contract and finance filters through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'purchase-contracts',
      {
        supplierName: '供应商甲',
        status: '已签署',
        signDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'receipts',
      {
        customerName: '客户甲',
        status: '已收款',
        receiptDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 2,
        pageSize: 15,
      },
    )

    await listBusinessModule(
      'payments',
      {
        businessType: '供应商',
        status: '已付款',
        paymentDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 3,
        pageSize: 15,
      },
    )

    await listBusinessModule(
      'receivables-payables',
      {
        direction: '应付',
        counterpartyType: '供应商',
        status: '已确认',
      },
      {
        currentPage: 1,
        pageSize: 30,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(1, '/purchase-contracts', {
      params: {
        supplierName: '供应商甲',
        status: '已签署',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 0,
        size: 20,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(2, '/receipts', {
      params: {
        customerName: '客户甲',
        status: '已收款',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 1,
        size: 15,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(3, '/payments', {
      params: {
        businessType: '供应商',
        status: '已付款',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 2,
        size: 15,
      },
    })
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(
      4,
      '/receivables-payables',
      {
        params: {
          direction: '应付',
          counterpartyType: '供应商',
          status: '已确认',
          page: 0,
          size: 30,
        },
      },
    )
  })

  it('passes invoice filters and date ranges through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'invoice-receipts',
      {
        supplierName: '供应商甲',
        status: '已收票',
        invoiceDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'invoice-issues',
      {
        customerName: '客户甲',
        status: '已开票',
        invoiceDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 2,
        pageSize: 15,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(
      1,
      '/invoice-receipts',
      {
        params: {
          supplierName: '供应商甲',
          status: '已收票',
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          page: 0,
          size: 20,
        },
      },
    )
    expect(clientMocks.httpGet).toHaveBeenNthCalledWith(2, '/invoice-issues', {
      params: {
        customerName: '客户甲',
        status: '已开票',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
        page: 1,
        size: 15,
      },
    })
  })

  it('passes pending invoice receipt report filters and date ranges through to backend queries', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'pending-invoice-receipt-report',
      {
        supplierName: '供应商甲',
        orderDate: ['2026-04-01', '2026-04-30'],
      },
      {
        currentPage: 1,
        pageSize: 30,
      },
    )

    expect(clientMocks.httpGet).toHaveBeenCalledWith(
      '/pending-invoice-receipt-report',
      {
        params: {
          supplierName: '供应商甲',
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          page: 0,
          size: 30,
        },
      },
    )
  })

  it('warns once when unexpected filters trigger client-side fallback scanning', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: {
        records: [],
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    })

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { listBusinessModule } = await import('@/api/business')

    await listBusinessModule(
      'purchase-orders',
      {
        unexpectedFilter: '供应商甲',
      },
      {
        currentPage: 1,
        pageSize: 20,
      },
    )

    await listBusinessModule(
      'purchase-orders',
      {
        unexpectedFilter: '供应商乙',
      },
      {
        currentPage: 2,
        pageSize: 10,
      },
    )

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[business-api] purchase-orders fell back to client-side filtering for unsupported filters: unexpectedFilter',
      '\nConsider adding these keys to module-contracts.ts nativeFilterKeys.',
    )
    warnSpy.mockRestore()
  })

  it('returns code=4000 with warning message when client filter hits row limit', async () => {
    const { listBusinessModule } = await import('@/api/business')
    // Each page returns 200 rows, not last. After 10 pages (2000 rows), the hard limit triggers.
    const pageRecords = Array.from({ length: 200 }, (_, i) => ({
      id: String(i + 1),
      supplierName: `供应商${i + 1}`,
    }))
    const pageResponse = {
      code: 0,
      data: { records: pageRecords, totalElements: 5000, totalPages: 25, last: false },
    }
    for (let i = 0; i < 15; i++) {
      clientMocks.httpGet.mockResolvedValueOnce(pageResponse)
    }

    const result = await listBusinessModule(
      'purchase-orders',
      { unexpectedFilter: '供应商乙' },
      { currentPage: 1, pageSize: 20 },
    )

    expect(result.code).toBe(4000)
    expect(result.message).toContain('结果不完整')
    expect(result.message).toContain('2000')
  })
})
