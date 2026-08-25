import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ZodType } from 'zod'
import { parseApiContract } from '@/api/core/api-contract'

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
}))

import { listFreightSalesOrderCandidatePage } from './freight-bill-candidates'

const TARGET_ORDER_ID = '350692799655452672'
const TARGET_ITEM_ID = '350692800100048896'

const candidatePage = {
  content: [
    {
      id: TARGET_ORDER_ID,
      orderNo: TARGET_ORDER_ID,
      purchaseInboundNo: '350687495421173760',
      purchaseOrderNo: '350234724267991040',
      customerCode: '333230231827521536',
      customerId: '333230231827521536',
      customerName: '浙江申源建设有限公司',
      projectId: '334872390498512897',
      projectName: '海宁市红宝热电有限公司等容量改造提升项目',
      settlementCompanyId: '332601703884922880',
      settlementCompanyName: '颖捷建材',
      deliveryDate: '2026-08-25',
      salesName: '系统管理员',
      totalWeight: 46.739,
      totalAmount: 150109.36,
      status: '完成销售',
      deletedFlag: false,
      remark: null,
      items: [
        {
          id: TARGET_ITEM_ID,
          lineNo: 1,
          materialId: '335117385759465472',
          materialCode: '335117385751076864',
          brand: '亚新',
          category: '盘螺',
          material: 'HRB400',
          spec: '8',
          length: '-',
          unit: '吨',
          sourceInboundItemId: '350687495446339584',
          sourcePurchaseOrderItemId: null,
          settlementCompanyId: '332601703884922880',
          settlementCompanyName: '颖捷建材',
          warehouseId: '335117474255085568',
          warehouseName: '恒基库',
          batchNo: '2NSJQFIT46PS',
          batchNoNormalized: '2NSJQFIT46PS',
          quantity: 2,
          quantityUnit: '件',
          pieceWeightTon: 2.3,
          piecesPerBundle: 1,
          weightTon: 4.546,
          unitPrice: 3340,
          amount: 15183.64,
          originalWeightTon: null,
        },
      ],
    },
  ],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
}

describe('物流单销售订单候选接口', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('候选响应缺少附加费用字段时仍能解析并保留大整数 ID', async () => {
    apiGetMock.mockImplementation((_url: string, schema: ZodType) =>
      parseApiContract(
        schema,
        candidatePage,
        'GET /freight-bills/sales-order-candidates',
      ),
    )

    const response = await listFreightSalesOrderCandidatePage({}, 0, 30)

    expect(response.data?.rows?.[0]?.id).toBe(TARGET_ORDER_ID)
    expect(response.data?.rows?.[0]?.items?.[0]?.id).toBe(TARGET_ITEM_ID)
  })
})
