import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/DocumentReferenceStatusIcons', () => ({
  DocumentReferenceStatusIcons: () => null,
}))

import type { ModuleRecord } from '@/types/module-page'
import {
  buildPurchaseOrderOverview,
  renderPurchaseOrderNo,
} from './purchase-order-rules'

describe('purchase-order-rules', () => {
  it('空行集合返回零值概览', () => {
    const overview = buildPurchaseOrderOverview([])
    expect(overview).toHaveLength(3)
    expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
      true,
    )
  })

  it('汇总订单金额', () => {
    const overview = buildPurchaseOrderOverview([
      { totalAmount: 100.5 },
      { totalAmount: 200 },
    ] as unknown as ModuleRecord[])
    expect(String(overview[2].value)).toContain('300.50')
  })

  it('renderPurchaseOrderNo 返回 React 元素', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: true,
    })
    expect(node).toBeTruthy()
    expect(node).toHaveProperty('props')
  })
})
