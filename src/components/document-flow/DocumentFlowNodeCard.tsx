import { Tag, Tooltip } from 'antd'
import type { RefObject } from 'react'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import { formatDate } from '@/utils/formatters'
import {
  DOCUMENT_FLOW_TYPE_META,
  type DocumentFlowTranslator,
  documentFlowNodeTooltip,
  documentFlowTypeLabel,
  formatDocumentFlowAmount,
  formatDocumentFlowWeight,
} from './document-flow-meta'
import {
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  type FlowLayoutNode,
} from './flow-layout'

/** 金额/重量文案：缺失即空串，调用方据此整段不渲染。 */
function resolveNodeMetrics(node: DocumentFlowNode) {
  return {
    amountText: formatDocumentFlowAmount(node.amount),
    weightText: formatDocumentFlowWeight(node.weight),
  }
}

function NodeMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="document-flow-node-metric">
      <span className="document-flow-node-metric-label">{label}</span>
      <span className="document-flow-node-metric-value">{value}</span>
    </span>
  )
}

/** 卡片底部的金额/重量行（两者都没有时整段不渲染）。 */
function NodeMetrics({
  amountText,
  t,
  weightText,
}: {
  amountText: string
  t: DocumentFlowTranslator
  weightText: string
}) {
  if (!amountText && !weightText) {
    return null
  }
  return (
    <span className="document-flow-node-metrics">
      {amountText ? (
        <NodeMetric label={t('documentFlow.amount')} value={amountText} />
      ) : null}
      {weightText ? (
        <NodeMetric label={t('documentFlow.weight')} value={weightText} />
      ) : null}
    </span>
  )
}

/** 状态 + 日期行（两者都没有时整段不渲染）。 */
function NodeMeta({ node }: { node: DocumentFlowNode }) {
  if (!node.status && !node.date) {
    return null
  }
  return (
    <span className="document-flow-node-meta">
      {node.status ? (
        <Tag className="document-flow-node-status">{node.status}</Tag>
      ) : null}
      {node.date ? <span>{formatDate(node.date)}</span> : null}
    </span>
  )
}

interface NodeCardProps {
  currentNodeRef: RefObject<HTMLButtonElement | null>
  isCurrent: boolean
  item: FlowLayoutNode
  onOpenNode?: (node: DocumentFlowNode) => void
  t: DocumentFlowTranslator
}

/**
 * 单个单据卡片（绝对定位在画布上）。
 *
 * <p>DOM 结构与 class 名是既有契约（`DocumentFlowModal.spec.tsx` 逐个断言），
 * 从 Modal 里原样搬出，只把「类型/金额格式化」这类纯函数换成 meta 模块的出口。</p>
 */
export function DocumentFlowNodeCard({
  currentNodeRef,
  isCurrent,
  item,
  onOpenNode,
  t,
}: NodeCardProps) {
  const meta = DOCUMENT_FLOW_TYPE_META[item.node.type]
  const { amountText, weightText } = resolveNodeMetrics(item.node)

  return (
    <Tooltip title={documentFlowNodeTooltip(t, item.node, Boolean(onOpenNode))}>
      <button
        type="button"
        ref={isCurrent ? currentNodeRef : undefined}
        className={`document-flow-node${isCurrent ? ' document-flow-node-current' : ''}`}
        disabled={!onOpenNode}
        aria-current={isCurrent ? 'true' : undefined}
        style={{
          left: item.x,
          top: item.y,
          width: FLOW_NODE_WIDTH,
          height: FLOW_NODE_HEIGHT,
          ...(meta ? { borderTopColor: meta.color } : {}),
        }}
        aria-label={
          onOpenNode
            ? t('documentFlow.openDocument', {
                no: item.node.no ?? item.node.id,
              })
            : undefined
        }
        onClick={() => onOpenNode?.(item.node)}
      >
        {/*
          类型与「当前单据」徽标同一行：徽标不再绝对定位压在上边框上
          （top:-9px 会盖住节点描边、也容易被相邻节点遮住）。
        */}
        <span className="document-flow-node-head">
          <span
            className="document-flow-node-type"
            style={meta ? { color: meta.color } : undefined}
          >
            {documentFlowTypeLabel(t, item.node.type)}
          </span>
          {isCurrent ? (
            <span className="document-flow-node-badge">
              {t('documentFlow.currentBadge')}
            </span>
          ) : null}
        </span>
        <span className="document-flow-node-no">
          {item.node.no ?? item.node.id}
        </span>
        <NodeMeta node={item.node} />
        <NodeMetrics amountText={amountText} t={t} weightText={weightText} />
      </button>
    </Tooltip>
  )
}

interface NodesProps {
  currentNodeKey: string | null
  currentNodeRef: RefObject<HTMLButtonElement | null>
  nodes: FlowLayoutNode[]
  onOpenNode?: (node: DocumentFlowNode) => void
  t: DocumentFlowTranslator
}

/** 画布上全部单据卡片（按 layout 的绝对坐标铺开）。 */
export function DocumentFlowNodes({
  currentNodeKey,
  currentNodeRef,
  nodes,
  onOpenNode,
  t,
}: NodesProps) {
  return (
    <>
      {nodes.map((item) => (
        <DocumentFlowNodeCard
          key={item.key}
          currentNodeRef={currentNodeRef}
          isCurrent={item.key === currentNodeKey}
          item={item}
          onOpenNode={onOpenNode}
          t={t}
        />
      ))}
    </>
  )
}
