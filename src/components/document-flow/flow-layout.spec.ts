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

  it('同层 median 排序减少交叉: 下游按上游邻接顺序排列', () => {
    const left1 = node('purchase-order', '1', 'PO-1')
    const left2 = node('purchase-order', '2', 'PO-2')
    const right1 = node('purchase-inbound', '3', 'IN-1')
    const right2 = node('purchase-inbound', '4', 'IN-2')

    // 输入顺序故意让同层右侧顺序与左侧相反, 造成交叉连线。
    const layout = layoutDocumentFlow(
      [left1, left2, right2, right1],
      [link(left1, right1), link(left2, right2)],
    )

    const rowOf = (key: string) =>
      layout.nodes.find((item) => item.key === key)?.y ?? -1
    expect(rowOf('purchase-order:1')).toBeLessThan(rowOf('purchase-order:2'))
    // 经过前向/后向扫描后, 与 PO-1 → IN-1 对齐, 不再交叉。
    expect(rowOf('purchase-inbound:3')).toBeLessThan(
      rowOf('purchase-inbound:4'),
    )
  })

  it('同层排序确定且可复现: 相同输入多次布局结果一致', () => {
    const nodes = [
      node('purchase-order', '1', 'PO-1'),
      node('purchase-order', '2', 'PO-2'),
      node('purchase-inbound', '3', 'IN-3'),
      node('purchase-inbound', '4', 'IN-4'),
    ]
    const links = [link(nodes[0], nodes[3]), link(nodes[1], nodes[2])]
    const first = layoutDocumentFlow(nodes, links)
    const second = layoutDocumentFlow(nodes, links)

    expect(second.nodes.map((item) => `${item.key}@${item.y}`)).toEqual(
      first.nodes.map((item) => `${item.key}@${item.y}`),
    )
  })

  it('环形引用与缺失端点不抛错且仍可布局', () => {
    const a = node('purchase-order', '1', 'PO-1')
    const b = node('purchase-inbound', '2', 'IN-2')
    const c = node('sales-order', '3', 'SO-3')
    // a → b → c → a 构成环; 同时混入缺失端点连线。
    const layout = layoutDocumentFlow(
      [a, b, c],
      [
        link(a, b),
        link(b, c),
        link(c, a),
        link(a, node('sales-order', '404')),
        link(node('freight-bill', '405'), b),
      ],
    )

    expect(layout.nodes).toHaveLength(3)
    expect(layout.edges).toHaveLength(3)
    for (const item of layout.nodes) {
      expect(Number.isFinite(item.x)).toBe(true)
      expect(Number.isFinite(item.y)).toBe(true)
    }
  })
})
