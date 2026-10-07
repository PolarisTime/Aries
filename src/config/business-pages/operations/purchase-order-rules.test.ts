import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/DocumentReferenceStatusIcons', () => ({
  DocumentReferenceStatusIcons: () => null,
}))

import { isValidElement, type ReactElement } from 'react'
import type { DocumentReferenceStatus } from '@/components/DocumentReferenceStatusIcons'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildPurchaseOrderOverview,
  renderPurchaseOrderNo,
} from './purchase-order-rules'

interface IconsElementProps {
  statuses: readonly DocumentReferenceStatus[]
}

/**
 * `renderPurchaseOrderNo` 只负责创建元素树（不渲染），因此直接从返回的
 * React 元素中读取传给 `DocumentReferenceStatusIcons` 的 `statuses`。
 */
function capturedStatuses(node: unknown): readonly DocumentReferenceStatus[] {
  if (!isValidElement(node)) {
    throw new Error('renderPurchaseOrderNo 应返回 React 元素')
  }
  const children = (node.props as { children?: unknown }).children
  const list = Array.isArray(children) ? children : [children]
  const icons = list.find(
    (child): child is ReactElement<IconsElementProps> =>
      isValidElement(child) &&
      Array.isArray((child.props as { statuses?: unknown }).statuses),
  )
  if (!icons) {
    throw new Error('未找到引用状态组件')
  }
  return icons.props.statuses
}

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

  it('同时传入销售订单与采购入库两个引用状态', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: true,
      referencedByPurchaseInbound: false,
    })

    const statuses = capturedStatuses(node)
    expect(statuses.map((status) => status.key)).toEqual([
      'sales-order',
      'purchase-inbound',
    ])
    expect(statuses.map((status) => status.label)).toEqual([
      '已被销售订单引用',
      '已被采购入库引用',
    ])
  })

  it('两个引用状态按记录取值透传', () => {
    const node = renderPurchaseOrderNo('PO-1', {
      id: '1932500000000000001',
      referencedBySalesOrder: false,
      referencedByPurchaseInbound: true,
    })

    const statuses = capturedStatuses(node)
    expect(
      statuses.find((status) => status.key === 'sales-order'),
    ).toMatchObject({ referenced: false })
    expect(
      statuses.find((status) => status.key === 'purchase-inbound'),
    ).toMatchObject({ referenced: true })
  })

  it('缺失引用字段时按未引用处理', () => {
    const node = renderPurchaseOrderNo('PO-1', { id: '1932500000000000001' })

    const statuses = capturedStatuses(node)
    expect(statuses.every((status) => status.referenced === false)).toBe(true)
  })
})
