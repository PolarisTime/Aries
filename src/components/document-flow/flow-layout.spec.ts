import { describe, expect, it } from 'vitest'
import {
  FLOW_CANVAS_PADDING,
  FLOW_COLUMN_GAP,
  FLOW_NODE_WIDTH,
  layoutDocumentFlow,
} from '@/components/document-flow/flow-layout'
import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'

const node = (type: string, id: string, no = `${type}-${id}`) =>
  ({ type, id, no }) satisfies DocumentFlowNode

const link = (
  from: DocumentFlowNode,
  to: DocumentFlowNode,
  linkType = '流转',
) =>
  ({
    fromType: from.type,
    fromId: from.id,
    toType: to.type,
    toId: to.id,
    linkType,
  }) satisfies DocumentFlowLink

describe('layoutDocumentFlow', () => {
  const order = node('purchase-order', '1', 'PO-1')
  const inbound = node('purchase-inbound', '2', 'IN-1')
  const salesOrder = node('sales-order', '3', 'SO-1')

  it('按引用方向分层: 线性链路层级递增且 x 逐列右移', () => {
    const layout = layoutDocumentFlow(
      [order, inbound, salesOrder],
      [link(order, inbound), link(inbound, salesOrder)],
    )

    expect(layout.nodes.map((item) => item.level)).toEqual([0, 1, 2])
    const [first, second, third] = layout.nodes
    expect(second.x - first.x).toBe(FLOW_NODE_WIDTH + FLOW_COLUMN_GAP)
    expect(third.x - second.x).toBe(FLOW_NODE_WIDTH + FLOW_COLUMN_GAP)
    expect(layout.edges).toHaveLength(2)
    expect(layout.edges[0].path.startsWith('M ')).toBe(true)
    expect(layout.width).toBe(third.x + FLOW_NODE_WIDTH + FLOW_CANVAS_PADDING)
  })

  it('同层节点纵向排列且整体居中', () => {
    const second = node('purchase-inbound', '9', 'IN-9')
    const layout = layoutDocumentFlow(
      [order, inbound, second],
      [link(order, inbound), link(order, second)],
    )

    const children = layout.nodes.filter((item) => item.level === 1)
    expect(children).toHaveLength(2)
    expect(children[0].y).not.toBe(children[1].y)
    expect(children[0].x).toBe(children[1].x)
  })

  it('过滤未知端点、自环与重复连线', () => {
    const layout = layoutDocumentFlow(
      [order, inbound],
      [
        link(order, inbound),
        link(order, inbound),
        link(order, node('sales-order', '404')),
        link(order, order),
      ],
    )

    expect(layout.nodes).toHaveLength(2)
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0].fromKey).toBe('purchase-order:1')
    expect(layout.edges[0].toKey).toBe('purchase-inbound:2')
  })

  it('空输入返回空布局', () => {
    const layout = layoutDocumentFlow([], [])
    expect(layout.nodes).toEqual([])
    expect(layout.edges).toEqual([])
    expect(layout.width).toBe(FLOW_CANVAS_PADDING * 2)
  })
})
