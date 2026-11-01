import {
  type DocumentFlowTranslator,
  documentFlowEdgeMetricLabel,
  documentFlowLinkTypeLabel,
} from './document-flow-meta'
import type { FlowLayoutEdge } from './flow-layout'

interface Props {
  edges: FlowLayoutEdge[]
  height: number
  t: DocumentFlowTranslator
  width: number
}

/**
 * 连线层（SVG）：箭头 marker + 贝塞尔连线 + 连线上的数量文字。
 *
 * <p>类型文字不再画在连线上（同一汇聚干线会重复出现「销售」），改由每条 `<path>` 的
 * `<title>` 承载：读屏可读、悬浮可见；数量也一并进 title，视觉上只画数量。</p>
 */
export function DocumentFlowEdges({ edges, height, t, width }: Props) {
  return (
    <svg
      className="document-flow-edges"
      width={width}
      height={height}
      aria-hidden="true"
    >
      <defs>
        <marker
          id="document-flow-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const edgeTitle = [
          documentFlowLinkTypeLabel(t, edge.linkType),
          documentFlowEdgeMetricLabel(t, edge),
        ]
          .filter(Boolean)
          .join(' · ')
        return (
          <path
            key={edge.key}
            className="document-flow-edge"
            d={edge.path}
            markerEnd="url(#document-flow-arrow)"
          >
            {edgeTitle ? <title>{edgeTitle}</title> : null}
          </path>
        )
      })}
      {edges.map((edge) => {
        const metricLabel = documentFlowEdgeMetricLabel(t, edge)
        // 字段缺失（后端未返回 quantity/weight）时完全不渲染，不留空标签。
        return metricLabel ? (
          <text
            key={`${edge.key}:metric`}
            className="document-flow-edge-metric"
            x={edge.labelX}
            y={edge.labelY}
            textAnchor="middle"
          >
            {metricLabel}
          </text>
        ) : null
      })}
    </svg>
  )
}
