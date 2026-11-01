import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'

/** 流程图节点尺寸与间距（像素）。 */
export const FLOW_NODE_WIDTH = 180
export const FLOW_NODE_HEIGHT = 96
/**
 * 列间距。必须容得下连线上的「N 件 · N 吨」标签：实测 56px 时 11px 字号会把
 * 数量文字压到卡片边缘、被节点遮住（SVG 在节点下层），故放到 104px。
 */
export const FLOW_COLUMN_GAP = 104
export const FLOW_ROW_GAP = 20
export const FLOW_CANVAS_PADDING = 16
/**
 * 列头「单据类型 · N 张」占用的顶部高度。
 *
 * <p>列头是每列的类型摘要，必须与节点同列对齐、随画布一起横向滚动，因此画布顶部
 * 预留一条固定高度的带；节点的 y 从这里开始，连线几何仍按节点真实坐标计算。</p>
 */
export const FLOW_HEADER_HEIGHT = 28

export interface FlowLayoutNode {
  key: string
  node: DocumentFlowNode
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

/** 某一列的类型摘要：同层混排时按类型分组，逐一给出张数。 */
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

/** 取一组位置的中位数；无有效邻居时返回 null。 */
function medianPosition(
  keys: string[],
  position: Map<string, number>,
): number | null {
  const values: number[] = []
  for (const key of keys) {
    const value = position.get(key)
    if (value !== undefined) values.push(value)
  }
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 1
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2
}

/**
 * 对单层节点按参考邻居位置的中位数排序；无邻居的节点保留当前相对位置，
 * 再以原始发现顺序与 key 作为最终兜底，保证排序确定且可复现。
 */
function sortLevelByMedian(
  group: string[],
  referenceOf: (key: string) => string[],
  position: Map<string, number>,
  baseOrder: Map<string, number>,
): string[] {
  return [...group].sort((left, right) => {
    const leftMedian = medianPosition(referenceOf(left), position)
    const rightMedian = medianPosition(referenceOf(right), position)
    const leftValue =
      leftMedian ?? position.get(left) ?? Number.POSITIVE_INFINITY
    const rightValue =
      rightMedian ?? position.get(right) ?? Number.POSITIVE_INFINITY
    if (leftValue !== rightValue) return leftValue - rightValue
    const leftBase = baseOrder.get(left) ?? 0
    const rightBase = baseOrder.get(right) ?? 0
    if (leftBase !== rightBase) return leftBase - rightBase
    return left < right ? -1 : left > right ? 1 : 0
  })
}

/**
 * 同层防交叉排序：先按上游邻接位置前向扫描，再按下游邻接位置后向扫描，
 * 每遍都用最新位置重算中位数，逐步减少层间连线交叉。
 */
function orderLevels(
  levelGroups: Map<number, string[]>,
  predecessors: Map<string, string[]>,
  successors: Map<string, string[]>,
  baseOrder: Map<string, number>,
): Map<number, string[]> {
  const levels = Array.from(levelGroups.keys()).sort((a, b) => a - b)
  const groups = new Map<number, string[]>(
    levels.map((level) => [level, [...(levelGroups.get(level) ?? [])]]),
  )
  const collectPositions = () => {
    const position = new Map<string, number>()
    for (const level of levels) {
      const group = groups.get(level) ?? []
      for (let index = 0; index < group.length; index += 1) {
        position.set(group[index], index)
      }
    }
    return position
  }

  let position = collectPositions()
  for (const level of levels) {
    groups.set(
      level,
      sortLevelByMedian(
        groups.get(level) ?? [],
        (key) => predecessors.get(key) ?? [],
        position,
        baseOrder,
      ),
    )
    position = collectPositions()
  }
  for (const level of [...levels].reverse()) {
    groups.set(
      level,
      sortLevelByMedian(
        groups.get(level) ?? [],
        (key) => successors.get(key) ?? [],
        position,
        baseOrder,
      ),
    )
    position = collectPositions()
  }
  return groups
}

/**
 * 将扁平的节点/连线整理为分层流程图布局：
 * 按引用方向做最长路径分层（左 → 右），同层节点用 median/barycenter 防交叉排序后纵向排列并整体居中。
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

  const successors = new Map<string, string[]>()
  const predecessors = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  const seenEdges = new Set<string>()
  const validEdges: {
    key: string
    from: string
    to: string
    link: DocumentFlowLink
  }[] = []
  for (const key of nodesByKey.keys()) {
    successors.set(key, [])
    predecessors.set(key, [])
    indegree.set(key, 0)
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
    successors.get(from)?.push(to)
    predecessors.get(to)?.push(from)
    indegree.set(to, (indegree.get(to) ?? 0) + 1)
  }

  const levelOf = new Map<string, number>()
  const queue = Array.from(nodesByKey.keys()).filter(
    (key) => (indegree.get(key) ?? 0) === 0,
  )
  const remaining = new Map(indegree)
  // 用 Set 记录已入队节点, 避免在循环内做 O(n) 的 queue.includes 查找。
  const enqueued = new Set(queue)
  for (const key of queue) levelOf.set(key, 0)
  while (queue.length) {
    const current = queue.shift() as string
    for (const next of successors.get(current) ?? []) {
      levelOf.set(
        next,
        Math.max(levelOf.get(next) ?? 0, (levelOf.get(current) ?? 0) + 1),
      )
      remaining.set(next, (remaining.get(next) ?? 0) - 1)
      if ((remaining.get(next) ?? 0) <= 0 && !enqueued.has(next)) {
        enqueued.add(next)
        queue.push(next)
      }
    }
  }
  // 环形引用兜底：按原始顺序补齐层级，保证仍然可渲染
  for (const key of nodesByKey.keys()) {
    if (!levelOf.has(key)) levelOf.set(key, 0)
  }

  const levelGroups = new Map<number, string[]>()
  for (const [key] of Array.from(nodesByKey.entries()).sort(
    (left, right) => (order.get(left[0]) ?? 0) - (order.get(right[0]) ?? 0),
  )) {
    const level = levelOf.get(key) ?? 0
    const group = levelGroups.get(level)
    if (group) group.push(key)
    else levelGroups.set(level, [key])
  }

  const maxRowCount = Math.max(
    1,
    ...Array.from(levelGroups.values(), (group) => group.length),
  )
  const orderedGroups = orderLevels(
    levelGroups,
    predecessors,
    successors,
    order,
  )
  const layoutNodes: FlowLayoutNode[] = []
  for (const level of Array.from(orderedGroups.keys()).sort((a, b) => a - b)) {
    const group = orderedGroups.get(level) ?? []
    const offset =
      ((maxRowCount - group.length) * (FLOW_NODE_HEIGHT + FLOW_ROW_GAP)) / 2
    group.forEach((key, row) => {
      layoutNodes.push({
        key,
        node: nodesByKey.get(key) as DocumentFlowNode,
        level,
        x: level * (FLOW_NODE_WIDTH + FLOW_COLUMN_GAP),
        // 顶部预留列头带，节点从这里开始；连线几何按同一坐标计算，不会错位。
        y:
          FLOW_HEADER_HEIGHT + offset + row * (FLOW_NODE_HEIGHT + FLOW_ROW_GAP),
      })
    })
  }

  /*
   * 列头摘要：每列显示「类型 · N 张」，替代把类型写在每条连线上
   * （同一汇聚干线上会重复出现「销售」，且连线一多就糊成一片）。
   * 同层混排（如退货单与物流单同层）时按类型分组拼接，顺序取该列首次出现顺序。
   */
  const layoutHeaders: FlowLayoutHeader[] = Array.from(orderedGroups.keys())
    .sort((a, b) => a - b)
    .map((level) => {
      const countByType = new Map<string, number>()
      for (const key of orderedGroups.get(level) ?? []) {
        const node = nodesByKey.get(key)
        if (!node) continue
        countByType.set(node.type, (countByType.get(node.type) ?? 0) + 1)
      }
      return {
        level,
        x: level * (FLOW_NODE_WIDTH + FLOW_COLUMN_GAP),
        width: FLOW_NODE_WIDTH,
        types: Array.from(countByType, ([type, count]) => ({ type, count })),
      }
    })

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
