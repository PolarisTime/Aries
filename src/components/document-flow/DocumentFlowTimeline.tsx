import {
  type DocumentFlowTranslator,
  documentFlowTypeLabel,
  formatDocumentFlowAmount,
  formatDocumentFlowWeight,
} from './document-flow-meta'
import type { FlowLayoutNode } from './flow-layout'

interface Props {
  /** 与图 / 列表视图共享的同一份布局节点（`data.nodes` 经 layout 投影）。 */
  nodes: FlowLayoutNode[]
  currentNodeKey: string | null
  t: DocumentFlowTranslator
}

/**
 * 按单据日期升序比较：
 *
 * <p>日期统一是后端给出的 `YYYY-MM-DD`（另见节点 schema 的可空 date），字典序即时间序，
 * 因此直接比较原串、不做时区解析。缺日期的节点统一排最后；两个都缺日期时返回 0，
 * 依赖 `Array.prototype.sort` 的稳定性（ES2019 起规范保证）保持接口返回的原始顺序，
 * 避免同一天的多张单据在重渲染之间跳动。</p>
 */
function compareByDate(left: FlowLayoutNode, right: FlowLayoutNode): number {
  const leftDate = left.node.date ?? ''
  const rightDate = right.node.date ?? ''
  if (leftDate === rightDate) return 0
  if (!leftDate) return 1
  if (!rightDate) return -1
  return leftDate < rightDate ? -1 : 1
}

function TimelineMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="document-flow-timeline-metric">
      <span className="document-flow-timeline-metric-label">{label}</span>
      <span className="document-flow-timeline-metric-value">{value}</span>
    </span>
  )
}

/**
 * 时间线视图：按日期升序把同一批单据排成一条竖向链路。
 *
 * <p>与图 / 列表视图共用 `data.nodes`（经 {@link FlowLayoutNode} 携带 `key` 与节点本体），
 * 不发起任何额外请求。每行展示日期（缺省用 `—`）、类型、单号与金额 / 重量，数值口径
 * 全部复用 {@link formatDocumentFlowAmount} / {@link formatDocumentFlowWeight}，与图视图、
 * 列表视图保持同一处出口。节点在时间线里不可点击（与图视图「无 onOpenNode 时不可点」一致），
 * 因此行内不放按钮。</p>
 */
export function DocumentFlowTimeline({ nodes, currentNodeKey, t }: Props) {
  // 空数据不渲染容器：外层已有 Empty 兜底，这里再画一个空 `<ol>` 只会多出一块边框。
  if (nodes.length === 0) return null

  const sortedNodes = [...nodes].sort(compareByDate)

  return (
    <ol
      aria-label={t('documentFlow.viewTimeline')}
      className="document-flow-timeline"
    >
      {sortedNodes.map(({ key, node }) => {
        const isCurrent = key === currentNodeKey
        const amountText = formatDocumentFlowAmount(node.amount)
        const weightText = formatDocumentFlowWeight(node.weight)
        return (
          <li
            key={key}
            className={`document-flow-timeline-item${
              isCurrent ? ' document-flow-timeline-item-current' : ''
            }`}
            aria-current={isCurrent ? 'true' : undefined}
          >
            <span className="document-flow-timeline-date">
              {node.date ? node.date : '—'}
            </span>
            <span className="document-flow-timeline-type">
              {documentFlowTypeLabel(t, node.type)}
            </span>
            <span className="document-flow-timeline-no">
              {node.no ?? node.id}
            </span>
            {/* 金额 / 重量缺失时整段不渲染，与图视图、列表视图同一口径 */}
            {amountText ? (
              <TimelineMetric
                label={t('documentFlow.amount')}
                value={amountText}
              />
            ) : null}
            {weightText ? (
              <TimelineMetric
                label={t('documentFlow.weight')}
                value={weightText}
              />
            ) : null}
            {isCurrent ? (
              <span className="document-flow-timeline-badge">
                {t('documentFlow.currentBadge')}
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
