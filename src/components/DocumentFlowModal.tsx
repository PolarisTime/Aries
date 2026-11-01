import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Skeleton, Tag, Tooltip } from 'antd'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getDocumentFlow } from '@/api/system/document-flow'
import {
  FLOW_HEADER_HEIGHT,
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  type FlowLayoutEdge,
  flowNodeKey,
  layoutDocumentFlow,
} from '@/components/document-flow/flow-layout'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import { formatDate } from '@/utils/formatters'
import './document-flow/document-flow.css'

interface Props {
  open: boolean
  documentNo: string
  onClose: () => void
  /** 点击节点打开对应单据详情；未提供时节点不可点击。 */
  onOpenNode?: (node: DocumentFlowNode) => void
}

const TYPE_META: Readonly<Record<string, { key: string; color: string }>> = {
  'purchase-order': {
    key: 'purchaseOrder',
    color: 'var(--ant-color-primary, #1677ff)',
  },
  'purchase-inbound': {
    key: 'purchaseInbound',
    color: 'var(--ant-cyan-6, #13c2c2)',
  },
  'sales-order': {
    key: 'salesOrder',
    color: 'var(--ant-color-success, #52c41a)',
  },
  'sales-outbound': {
    key: 'salesOutbound',
    color: 'var(--ant-color-warning, #faad14)',
  },
  'sales-return': {
    key: 'salesReturn',
    color: 'var(--ant-color-error, #ff4d4f)',
  },
  'freight-bill': {
    key: 'freightBill',
    color: 'var(--ant-purple-6, #722ed1)',
  },
}

function formatMetric(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString('zh-CN', {
    // 金额/重量上万后不分组就只剩一串数字, 读不出量级; 小数位仍按业务口径压到 2 位。
    useGrouping: true,
    maximumFractionDigits: 2,
  })
}

/**
 * 关系边的类型文案。
 *
 * <p>类型文字已从连线上移除（同一汇聚干线上「销售」会重复出现），只保留在
 * {@code <title>} 里供读屏与悬浮提示。这里用静态 key 而不是模板串：模板串动态 key
 * 需要额外登记到 i18n 白名单，逐条静态 key 反而能被 i18n 门禁逐个校验。</p>
 */
function linkTypeLabel(
  t: (key: string) => string,
  linkType: string | undefined,
): string {
  switch (linkType) {
    case '入库':
      return t('documentFlow.linkTypes.inbound')
    case '销售':
      return t('documentFlow.linkTypes.sales')
    case '出库':
      return t('documentFlow.linkTypes.outbound')
    case '退货':
      return t('documentFlow.linkTypes.returns')
    case '物流':
      return t('documentFlow.linkTypes.freight')
    default:
      return linkType ?? ''
  }
}

export function DocumentFlowModal({
  open,
  documentNo,
  onClose,
  onOpenNode,
}: Props) {
  const { t } = useTranslation()
  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.documentFlow(documentNo),
    queryFn: ({ signal }) => getDocumentFlow(documentNo, signal),
    enabled: open && Boolean(documentNo),
    staleTime: 0,
  })

  const nodes = data?.nodes ?? []
  const layout = useMemo(
    () => layoutDocumentFlow(data?.nodes ?? [], data?.links ?? []),
    [data],
  )
  const currentNodeKey = useMemo(() => {
    if (!data) return null
    const target = data.nodes.find(
      (item) =>
        item.no === data.documentNo ||
        (item.no == null && String(item.id) === data.documentNo),
    )
    return target ? flowNodeKey(target) : null
  }, [data])
  const currentNodeRef = useRef<HTMLButtonElement | null>(null)
  // 数据到达后把当前起始单据滚动进可视区并居中。
  useEffect(() => {
    if (!open || !currentNodeKey) return
    const target = currentNodeRef.current
    if (typeof target?.scrollIntoView === 'function') {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }, [open, currentNodeKey])
  const typeLabelOfType = (type: string) => {
    const meta = TYPE_META[type]
    return meta
      ? t(`documentFlow.types.${meta.key}`)
      : type || t('documentFlow.title')
  }
  const typeLabelOf = (node: DocumentFlowNode) => typeLabelOfType(node.type)
  /**
   * 关系边上的数量文案（件 / 吨）。
   *
   * <p>后端新字段可空：任一缺失都不拼进结果，两个都缺失时返回空串，调用方据此
   * 完全不渲染文本节点——不在图上留空壳、也不显示「undefined」。</p>
   */
  const edgeMetricLabelOf = (edge: FlowLayoutEdge) => {
    const parts: string[] = []
    if (edge.quantity !== null) {
      parts.push(
        t('documentFlow.edgeQuantity', { value: formatMetric(edge.quantity) }),
      )
    }
    if (edge.weight !== null) {
      parts.push(
        t('documentFlow.edgeWeight', { value: formatMetric(edge.weight) }),
      )
    }
    return parts.join(' · ')
  }
  const nodeTooltip = (node: DocumentFlowNode) => {
    const lines = [
      `${typeLabelOf(node)} ${node.no ?? node.id}`,
      node.amount != null
        ? `${t('documentFlow.amount')}: ${formatMetric(node.amount)}`
        : '',
      node.weight != null
        ? `${t('documentFlow.weight')}: ${formatMetric(node.weight)}`
        : '',
      onOpenNode ? t('documentFlow.nodeHint') : '',
    ].filter(Boolean)
    return lines.join('\n')
  }

  return (
    <Modal
      open={open}
      title={t('documentFlow.titleWithNo', { no: documentNo || '--' })}
      /*
       * 5 列以上（采购单→入库→销售单→出库→退货）时画布宽度约 1350px，
       * 1280 会横向裁掉最后一列只能靠滚动；放宽到 1560 让常见链路一屏看完。
       */
      width="min(1560px, 96vw)"
      footer={null}
      onCancel={onClose}
      className="document-flow-modal"
    >
      {isPending && nodes.length === 0 ? <Skeleton active /> : null}
      {isError ? (
        <Alert
          showIcon
          type="error"
          title={
            error instanceof Error
              ? error.message
              : t('documentFlow.loadFailed')
          }
          action={
            <Button size="small" onClick={() => void refetch()}>
              {t('error.retry')}
            </Button>
          }
        />
      ) : null}
      {!isPending && !isError && nodes.length === 0 ? (
        <Empty description={t('documentFlow.empty')} />
      ) : null}
      {nodes.length > 0 ? (
        <>
          <div className="document-flow-summary">
            <span className="document-flow-summary-count">
              {t('documentFlow.documentCount', { count: nodes.length })}
              {isFetching ? ' …' : ''}
            </span>
            <span className="document-flow-legend">
              <span className="document-flow-legend-item">
                {t('documentFlow.legendUpstream')}
              </span>
              <span
                className="document-flow-legend-arrow"
                role="img"
                aria-label={t('documentFlow.legendLabel')}
              >
                →
              </span>
              <span className="document-flow-legend-item">
                {t('documentFlow.legendDownstream')}
              </span>
            </span>
          </div>
          {/* 服务端达到节点/关系上限会截断；不提示就等于让用户以为这就是全部。 */}
          {data?.truncated ? (
            <Alert
              className="document-flow-truncated"
              showIcon
              type="warning"
              title={t('documentFlow.truncated')}
            />
          ) : null}
          <div className="document-flow-viewport">
            <div
              className="document-flow-canvas"
              style={{ width: layout.width, height: layout.height }}
            >
              {layout.headers.map((header) => (
                <div
                  key={`level:${header.level}`}
                  className="document-flow-column-header"
                  style={{
                    left: header.x,
                    width: header.width,
                    height: FLOW_HEADER_HEIGHT,
                  }}
                >
                  {header.types
                    .map((group) =>
                      t('documentFlow.typeCount', {
                        type: typeLabelOfType(group.type),
                        count: group.count,
                      }),
                    )
                    .join(' · ')}
                </div>
              ))}
              <svg
                className="document-flow-edges"
                width={layout.width}
                height={layout.height}
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
                {layout.edges.map((edge) => {
                  /*
                   * 类型文字不再画在连线上（同一汇聚干线会重复出现「销售」），
                   * 改由 <title> 承载：读屏可读、悬浮可见；数量也一并进 title，
                   * 视觉上只把数量画在线上。
                   */
                  const edgeTitle = [
                    linkTypeLabel(t, edge.linkType),
                    edgeMetricLabelOf(edge),
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
                {layout.edges.map((edge) => {
                  const metricLabel = edgeMetricLabelOf(edge)
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
              {layout.nodes.map((item) => {
                const meta = TYPE_META[item.node.type]
                const isCurrent = item.key === currentNodeKey
                const amountText =
                  item.node.amount != null ? formatMetric(item.node.amount) : ''
                const weightText =
                  item.node.weight != null ? formatMetric(item.node.weight) : ''
                return (
                  <Tooltip key={item.key} title={nodeTooltip(item.node)}>
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
                          {typeLabelOf(item.node)}
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
                      <span className="document-flow-node-meta">
                        {item.node.status ? (
                          <Tag className="document-flow-node-status">
                            {item.node.status}
                          </Tag>
                        ) : null}
                        {item.node.date ? (
                          <span>{formatDate(item.node.date)}</span>
                        ) : null}
                      </span>
                      {amountText || weightText ? (
                        <span className="document-flow-node-metrics">
                          {amountText ? (
                            <span className="document-flow-node-metric">
                              <span className="document-flow-node-metric-label">
                                {t('documentFlow.amount')}
                              </span>
                              <span className="document-flow-node-metric-value">
                                {amountText}
                              </span>
                            </span>
                          ) : null}
                          {weightText ? (
                            <span className="document-flow-node-metric">
                              <span className="document-flow-node-metric-label">
                                {t('documentFlow.weight')}
                              </span>
                              <span className="document-flow-node-metric-value">
                                {weightText}
                              </span>
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </Modal>
  )
}
