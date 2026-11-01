import type {
  DocumentFlowLink,
  DocumentFlowNode,
} from '@/shared/schemas/document-flow'
import { DOCUMENT_FLOW_TYPE_META } from './document-flow-meta'
import {
  type FlowMetricValue,
  flowNodeKey,
  readLinkMetric,
} from './flow-layout'

/**
 * 「列表视图」的数据模型（纯函数，无 React 依赖）。
 *
 * <p>列表视图是图视图的**读屏替代与大图备用**：同一份 `data.nodes/links` 直接投影，
 * 不额外请求；分组顺序跟随 {@link DOCUMENT_FLOW_TYPE_META}（采购 → 入库 → 销售 → 出库 →
 * 退货 → 物流），未知类型排在已知类型之后、按出现顺序。</p>
 */
export interface DocumentFlowListEntry {
  key: string
  node: DocumentFlowNode
}

export interface DocumentFlowListGroup {
  type: string
  entries: DocumentFlowListEntry[]
}

export interface DocumentFlowListRelation {
  key: string
  fromKey: string
  fromNo: string
  fromType: string
  toKey: string
  toNo: string
  toType: string
  linkType?: string
  quantity: FlowMetricValue
  weight: FlowMetricValue
}

export interface DocumentFlowListModel {
  groups: DocumentFlowListGroup[]
  relations: DocumentFlowListRelation[]
}

function nodeLabel(node: DocumentFlowNode) {
  return node.no ?? String(node.id)
}

export function buildDocumentFlowListModel(
  nodes: readonly DocumentFlowNode[],
  links: readonly DocumentFlowLink[],
): DocumentFlowListModel {
  const nodeByKey = new Map<string, DocumentFlowNode>()
  const groupsByType = new Map<string, DocumentFlowListEntry[]>()
  for (const node of nodes) {
    const key = flowNodeKey(node)
    if (nodeByKey.has(key)) {
      continue
    }
    nodeByKey.set(key, node)
    const entries = groupsByType.get(node.type)
    if (entries) {
      entries.push({ key, node })
    } else {
      groupsByType.set(node.type, [{ key, node }])
    }
  }

  // 已知类型按 meta 顺序；未知类型保持首次出现顺序（sort 稳定）。
  const knownOrder = Object.keys(DOCUMENT_FLOW_TYPE_META)
  const rankOf = (type: string) => {
    const index = knownOrder.indexOf(type)
    return index === -1 ? knownOrder.length : index
  }
  const groups = Array.from(groupsByType, ([type, entries]) => ({
    type,
    entries,
  })).sort((left, right) => rankOf(left.type) - rankOf(right.type))

  const relations: DocumentFlowListRelation[] = []
  for (const link of links) {
    if (!link.fromType || !link.fromId || !link.toType || !link.toId) continue
    const fromKey = flowNodeKey({
      type: link.fromType,
      id: String(link.fromId),
    })
    const toKey = flowNodeKey({ type: link.toType, id: String(link.toId) })
    const from = nodeByKey.get(fromKey)
    const to = nodeByKey.get(toKey)
    // 端点不在节点集合里（被后端截断/数据不一致）就不进列表，避免出现空单号。
    if (!from || !to) continue
    relations.push({
      key: `${fromKey}->${toKey}#${link.linkType ?? ''}`,
      fromKey,
      fromNo: nodeLabel(from),
      fromType: from.type,
      toKey,
      toNo: nodeLabel(to),
      toType: to.type,
      linkType: link.linkType,
      quantity: readLinkMetric(link, 'quantity'),
      weight: readLinkMetric(link, 'weight'),
    })
  }

  return { groups, relations }
}
