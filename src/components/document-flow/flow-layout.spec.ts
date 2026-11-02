import { describe, expect, it } from 'vitest'
import {
  FLOW_CANVAS_PADDING,
  FLOW_COLUMN_GAP,
  FLOW_HEADER_HEIGHT,
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

  it('按类型分列: 线性链路各占一列且 x 逐列右移', () => {
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

  it('同一泳道多个节点纵向排列且整体居中', () => {
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

  it('列内按上游锚点排序减少交叉: 下游按上游邻接顺序排列', () => {
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

  it('列内排序确定且可复现: 相同输入多次布局结果一致', () => {
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

  it('按单据类型固定分列: 混排类型拆成多条泳道, 每列只有一种类型', () => {
    const inbound = node('purchase-inbound', '2', 'IN-1')
    const anotherInbound = node('purchase-inbound', '4', 'IN-2')
    const freight = node('freight-bill', '3', 'FB-1')
    const layout = layoutDocumentFlow(
      [order, inbound, anotherInbound, freight],
      [link(order, inbound), link(order, anotherInbound), link(order, freight)],
    )

    // 采购单 / 采购入库 / 物流单：三列都是单一类型，不再出现「入库 · 2 · 物流 · 1」的混合列
    expect(layout.headers.map((header) => header.types)).toEqual([
      [{ type: 'purchase-order', count: 1 }],
      [{ type: 'purchase-inbound', count: 2 }],
      [{ type: 'freight-bill', count: 1 }],
    ])
    expect(layout.headers.map((header) => header.level)).toEqual([0, 1, 2])
    expect(layout.headers[1].x - layout.headers[0].x).toBe(
      FLOW_NODE_WIDTH + FLOW_COLUMN_GAP,
    )
  })

  it('空泳道折叠: 没有单据的类型不占列位, 右侧泳道前移', () => {
    const salesOrder = node('sales-order', '3', 'SO-1')
    const layout = layoutDocumentFlow(
      [order, salesOrder],
      [link(order, salesOrder)],
    )

    expect(layout.headers.map((header) => header.types[0].type)).toEqual([
      'purchase-order',
      'sales-order',
    ])
    expect(layout.headers[1].x - layout.headers[0].x).toBe(
      FLOW_NODE_WIDTH + FLOW_COLUMN_GAP,
    )
    expect(
      layout.nodes.find((item) => item.key === 'sales-order:3')?.level,
    ).toBe(1)
  })

  it('未知单据类型追加在已知泳道之后', () => {
    const custom = node('custom-doc', '9', 'C-1')
    const layout = layoutDocumentFlow([custom, order], [])

    expect(layout.headers.map((header) => header.types[0].type)).toEqual([
      'purchase-order',
      'custom-doc',
    ])
  })

  it('列头与同列节点左边界对齐, 节点为列头带预留高度', () => {
    const layout = layoutDocumentFlow([order, inbound], [link(order, inbound)])

    for (const header of layout.headers) {
      const columnNodes = layout.nodes.filter(
        (item) => item.level === header.level,
      )
      expect(columnNodes.length).toBeGreaterThan(0)
      expect(header.x).toBe(columnNodes[0].x)
      expect(header.width).toBe(FLOW_NODE_WIDTH)
    }
    expect(layout.nodes[0].y).toBe(FLOW_CANVAS_PADDING + FLOW_HEADER_HEIGHT)
  })

  it('连线透传可空 quantity/weight, 缺失时为 null', () => {
    const layout = layoutDocumentFlow(
      [order, inbound],
      [
        link(order, inbound),
        {
          ...link(order, inbound),
          linkType: 'second',
          quantity: '10',
          weight: 12.5,
        },
      ],
    )

    expect(layout.edges).toHaveLength(2)
    expect(layout.edges[0].quantity).toBeNull()
    expect(layout.edges[0].weight).toBeNull()
    expect(layout.edges[1].quantity).toBe('10')
    expect(layout.edges[1].weight).toBe(12.5)
  })

  it('非法/空字符串的数量字段按缺失处理', () => {
    const layout = layoutDocumentFlow(
      [order, inbound],
      [{ ...link(order, inbound), quantity: '  ', weight: Number.NaN }],
    )

    expect(layout.edges[0].quantity).toBeNull()
    expect(layout.edges[0].weight).toBeNull()
  })

  it('空输入不产生列头', () => {
    const layout = layoutDocumentFlow([], [])
    expect(layout.headers).toEqual([])
  })
})
