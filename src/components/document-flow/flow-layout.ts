import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'

/** 流程图节点尺寸与间距（像素）。 */
export const FLOW_NODE_WIDTH = 184
export const FLOW_NODE_HEIGHT = 108
/**
 * 泳道间距。必须容得下连线上的「N 件 · N 吨」标签：实测 56px 时 11px 字号会把
 * 数量文字压到卡片边缘、被节点遮住（SVG 在节点下层），故放到 104px。
 */
export const FLOW_COLUMN_GAP = 116
export const FLOW_ROW_GAP = 20
export const FLOW_CANVAS_PADDING = 16
/**
 * 列头「单据类型 · N 张」占用的顶部高度。
 *
 * <p>列头是每条泳道的类型摘要，必须与节点同列对齐、随画布一起横向滚动，因此画布顶部
 * 预留一条固定高度的带；节点的 y 从这里开始，连线几何仍按节点真实坐标计算。</p>
 */
export const FLOW_HEADER_HEIGHT = 32

/**
 * 泳道（列）的固定类型顺序，左 → 右与业务链路一致：
 * 采购单 → 采购入库 → 销售订单 → 销售出库 → 销售退货 → 物流单。
 *
 * <p>后端单据流的边一律「上游 → 下游」，且上游类型全部排在本表更靠左的位置
 * （采购单→销售单这类跳过采购入库的直连也只是跨一条泳道），因此按本顺序排列
 * 不会出现指向左侧的边。未知类型追加在末尾，按首次出现顺序，保证新增单据也能渲染。</p>
 *
 * <p>没有单据的类型不占列位（空泳道折叠）：否则只有采购单+采购入库的单据流会被
 * 拉到 6 列宽，一屏放不下。</p>
 */
export const FLOW_LANE_ORDER = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
] as const

export interface FlowLayoutNode {
  key: string
  node: DocumentFlowNode
  /** 泳道序号（0 起，从左到右）；与列头 `level` 一一对应。 */
  level: number
  x: number
  y: number
}

/** 连线上的可空数量指标：后端可能返回 number 或字符串，缺失即 null。 */
export type FlowMetricValue = number | string | null

export interface FlowLayoutEdge {
  key: string
  fromKey: string
  toKey: string
  linkType?: string
  path: string
  labelX: number
  labelY: number
  /** 关系边上的引用数量（件）；后端未返回时为 null，界面必须完全不渲染。 */
  quantity: FlowMetricValue
  /** 关系边上的引用重量（吨）；后端未返回时为 null，界面必须完全不渲染。 */
  weight: FlowMetricValue
}

/** 某条泳道的类型摘要（拆列后每条泳道只有一种类型，保留数组形状以兼容渲染层）。 */
export interface FlowLayoutHeaderType {
  type: string
  count: number
}

export interface FlowLayoutHeader {
  level: number
  x: number
  width: number
  types: FlowLayoutHeaderType[]
}

export interface FlowLayout {
  nodes: FlowLayoutNode[]
  edges: FlowLayoutEdge[]
  headers: FlowLayoutHeader[]
  width: number
  height: number
}

export function flowNodeKey(node: { type: string; id: string }): string {
  return `${node.type}:${node.id}`
}

function edgeKey(link: DocumentFlowLink): string {
  // 同一对节点间可能存在多种关系(如物流单同时是销售单与出库单的下游),
  // key 必须包含 linkType, 否则多条连线会被误去重而丢失关系标签。
  return `${link.fromType ?? ''}:${link.fromId ?? ''}->${link.toType ?? ''}:${link.toId ?? ''}#${link.linkType ?? ''}`
}

/**
 * 读取关系边上的可空数量字段（quantity=件 / weight=吨）。
 *
 * <p>这两个字段由后端新增、契约里声明为可空（number 或十进制字符串），这里仍做一次
 * 运行时收窄：缺失、null、空串、非法数字一律当作没有，界面据此完全不渲染数量，
 * 避免出现空标签或「NaN 吨」。</p>
 */
export function readLinkMetric(
  link: DocumentFlowLink,
  field: 'quantity' | 'weight',
) {
  const raw = link[field]
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const trimmed = raw.trim()
  if (trimmed === '' || !Number.isFinite(Number(trimmed))) return null
  return trimmed
}

/**
 * 将扁平的节点/连线整理为「按单据类型固定分列」的泳道流程图：
 *
 * <ol>
 *   <li>列 = 单据类型（{@link FLOW_LANE_ORDER}），不再是"第 N 步"，同一类型无论在第几层
 *     都落在同一列；没有单据的类型不占列位。</li>
 *   <li>列内节点按「上游邻居的平均行号」排序，同上游时按首次发现顺序，减少跨列连线交叉。</li>
 *   <li>各列纵向整体居中；连线仍按节点真实坐标绘制。</li>
 * </ol>
 */
export function layoutDocumentFlow(
  flowNodes: DocumentFlowNode[],
  flowLinks: DocumentFlowLink[],
): FlowLayout {
  const order = new Map<string, number>()
  const nodesByKey = new Map<string, DocumentFlowNode>()
  for (const node of flowNodes) {
    const key = flowNodeKey(node)
    if (!nodesByKey.has(key)) {
      order.set(key, nodesByKey.size)
      nodesByKey.set(key, node)
    }
  }

  const predecessors = new Map<string, string[]>()
  const seenEdges = new Set<string>()
  const validEdges: {
    key: string
    from: string
    to: string
    link: DocumentFlowLink
  }[] = []
  for (const key of nodesByKey.keys()) {
    predecessors.set(key, [])
  }
  for (const link of flowLinks) {
    if (!link.fromType || !link.fromId || !link.toType || !link.toId) continue
    const from = flowNodeKey({ type: link.fromType, id: String(link.fromId) })
    const to = flowNodeKey({ type: link.toType, id: String(link.toId) })
    if (!nodesByKey.has(from) || !nodesByKey.has(to) || from === to) continue
    const key = edgeKey(link)
    if (seenEdges.has(key)) continue
    seenEdges.add(key)
    validEdges.push({ key, from, to, link })
    predecessors.get(to)?.push(from)
  }

  // 1) 按类型归并到泳道，再按固定顺序排（未知类型追加在末尾）
  const keysByType = new Map<string, string[]>()
  for (const key of nodesByKey.keys()) {
    const type = nodesByKey.get(key)?.type ?? ''
    const group = keysByType.get(type)
    if (group) group.push(key)
    else keysByType.set(type, [key])
  }
  const knownTypes: readonly string[] = FLOW_LANE_ORDER
  const orderedTypes = [
    ...knownTypes.filter((type) => keysByType.has(type)),
    ...Array.from(keysByType.keys()).filter(
      (type) => !knownTypes.includes(type),
    ),
  ]

  // 2) 列内排序：以上游邻居的平均行号为锚点（无上游的排在最前，保持发现顺序）
  const rowIndexOf = new Map<string, number>()
  const lanes = orderedTypes.map((type, laneIndex) => {
    const keys = [...(keysByType.get(type) ?? [])]
    const anchorOf = (key: string) => {
      const upstreamRows = (predecessors.get(key) ?? [])
        .map((upstreamKey) => rowIndexOf.get(upstreamKey))
        .filter((row): row is number => row !== undefined)
      if (!upstreamRows.length) return Number.NEGATIVE_INFINITY
      return (
        upstreamRows.reduce((sum, row) => sum + row, 0) / upstreamRows.length
      )
    }
    keys.sort((left, right) => {
      const anchorDiff = anchorOf(left) - anchorOf(right)
      if (Number.isFinite(anchorDiff) && anchorDiff !== 0) return anchorDiff
      return (order.get(left) ?? 0) - (order.get(right) ?? 0)
    })
    keys.forEach((key, row) => {
      rowIndexOf.set(key, row)
    })
    return { type, laneIndex, keys }
  })

  const maxRowCount = Math.max(1, ...lanes.map((lane) => lane.keys.length))
  const rowStep = FLOW_NODE_HEIGHT + FLOW_ROW_GAP
  const layoutNodes: FlowLayoutNode[] = []
  for (const lane of lanes) {
    const offset = ((maxRowCount - lane.keys.length) * rowStep) / 2
    lane.keys.forEach((key, row) => {
      layoutNodes.push({
        key,
        node: nodesByKey.get(key) as DocumentFlowNode,
        level: lane.laneIndex,
        x: lane.laneIndex * (FLOW_NODE_WIDTH + FLOW_COLUMN_GAP),
        // 顶部预留列头带，节点从这里开始；连线几何按同一坐标计算，不会错位。
        y: FLOW_HEADER_HEIGHT + offset + row * rowStep,
      })
    })
  }

  // 3) 每列一条列头：拆列后一条泳道只有一种类型，不再出现「A · 1 · B · 1」的混合列
  const layoutHeaders: FlowLayoutHeader[] = lanes.map((lane) => ({
    level: lane.laneIndex,
    x: lane.laneIndex * (FLOW_NODE_WIDTH + FLOW_COLUMN_GAP),
    width: FLOW_NODE_WIDTH,
    types: [{ type: lane.type, count: lane.keys.length }],
  }))

  const layoutByKey = new Map(layoutNodes.map((item) => [item.key, item]))
  const layoutEdges: FlowLayoutEdge[] = []
  for (const edge of validEdges) {
    const from = layoutByKey.get(edge.from)
    const to = layoutByKey.get(edge.to)
    if (!from || !to) continue
    layoutEdges.push({
      key: edge.key,
      fromKey: edge.from,
      toKey: edge.to,
      linkType: edge.link.linkType,
      path: buildEdgePath(from, to),
      labelX: (from.x + FLOW_NODE_WIDTH + to.x) / 2 + FLOW_CANVAS_PADDING,
      labelY:
        (from.y + to.y) / 2 + FLOW_NODE_HEIGHT / 2 + FLOW_CANVAS_PADDING - 4,
      quantity: readLinkMetric(edge.link, 'quantity'),
      weight: readLinkMetric(edge.link, 'weight'),
    })
  }

  const width =
    Math.max(0, ...layoutNodes.map((item) => item.x + FLOW_NODE_WIDTH)) +
    FLOW_CANVAS_PADDING * 2
  const height =
    Math.max(0, ...layoutNodes.map((item) => item.y + FLOW_NODE_HEIGHT)) +
    FLOW_CANVAS_PADDING * 2

  return {
    nodes: layoutNodes.map((item) => ({
      ...item,
      x: item.x + FLOW_CANVAS_PADDING,
      y: item.y + FLOW_CANVAS_PADDING,
    })),
    edges: layoutEdges,
    headers: layoutHeaders.map((header) => ({
      ...header,
      x: header.x + FLOW_CANVAS_PADDING,
    })),
    width,
    height,
  }
}

/** 三次贝塞尔连线：从上游节点右缘中点连到下游节点左缘中点。 */
function buildEdgePath(from: FlowLayoutNode, to: FlowLayoutNode): string {
  const startX = from.x + FLOW_NODE_WIDTH
  const startY = from.y + FLOW_NODE_HEIGHT / 2
  const endX = to.x
  const endY = to.y + FLOW_NODE_HEIGHT / 2
  const curve = Math.max(32, Math.abs(endX - startX) / 2)
  return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`
}
