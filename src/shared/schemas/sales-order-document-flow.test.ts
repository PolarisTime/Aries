import { describe, expect, it } from 'vitest'
import { salesOrderDocumentFlowSchema } from '@/shared/schemas/sales-order-document-flow'

describe('销售订单单据流契约', () => {
  it('解析 nodes/links 并保持雪花 ID 为字符串', () => {
    const parsed = salesOrderDocumentFlowSchema.parse({
      salesOrderId: '1001',
      nodes: [
        {
          type: 'sales-order',
          id: '1001',
          no: 'SO20260914001',
          status: '完成销售',
          amount: 700,
          weight: 3.5,
          date: '2026-09-14',
        },
        {
          type: 'sales-outbound',
          id: '2002',
          no: 'OB20260914001',
          status: '已审核',
          amount: 700,
          weight: 3.5,
          date: '2026-09-14',
        },
      ],
      links: [
        {
          fromType: 'sales-order',
          fromId: '1001',
          toType: 'sales-outbound',
          toId: '2002',
          linkType: 'reference',
        },
      ],
    })

    expect(parsed.salesOrderId).toBe('1001')
    expect(parsed.nodes).toHaveLength(2)
    expect(parsed.nodes[1].id).toBe('2002')
    expect(parsed.links[0].fromId).toBe('1001')
  })

  it('容忍后端新增字段', () => {
    const parsed = salesOrderDocumentFlowSchema.parse({
      salesOrderId: '1001',
      nodes: [
        {
          type: 'sales-return',
          id: '3003',
          no: 'RT20260914001',
          extraField: 'ignored',
        },
      ],
      links: [],
      generatedAt: '2026-09-14T10:00:00',
    })
    expect(parsed.nodes[0].type).toBe('sales-return')
  })
})
