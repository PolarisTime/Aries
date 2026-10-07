import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'

/** 流程图节点尺寸与间距（像素）。 */
export const FLOW_NODE_WIDTH = 180
export const FLOW_NODE_HEIGHT = 96
export const FLOW_COLUMN_GAP = 56
export const FLOW_ROW_GAP = 20
export const FLOW_CANVAS_PADDING = 16

export interface FlowLayoutNode {
  key: string
  node: DocumentFlowNode
  level: number
  x: number
  y: number
}

export interface FlowLayoutEdge {
  key: string
  fromKey: string
  toKey: string
  linkType?: string
  path: string
  labelX: number
  labelY: number
}

export interface FlowLayout {
  nodes: FlowLayoutNode[]
  edges: FlowLayoutEdge[]
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
        y: offset + row * (FLOW_NODE_HEIGHT + FLOW_ROW_GAP),
      })
    })
  }

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
