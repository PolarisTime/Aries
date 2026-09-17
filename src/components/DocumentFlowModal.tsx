import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Modal, Skeleton, Tag, Tooltip } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getDocumentFlow } from '@/api/system/document-flow'
import {
  FLOW_NODE_HEIGHT,
  FLOW_NODE_WIDTH,
  layoutDocumentFlow,
} from '@/components/document-flow/flow-layout'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import './document-flow/document-flow.css'

interface Props {
  open: boolean
  documentNo: string
  onClose: () => void
  /** 点击节点打开对应单据详情；未提供时节点不可点击。 */
  onOpenNode?: (node: DocumentFlowNode) => void
}

const TYPE_META: Readonly<Record<string, { key: string; color: string }>> = {
  'purchase-order': { key: 'purchaseOrder', color: '#1677ff' },
  'purchase-inbound': { key: 'purchaseInbound', color: '#13c2c2' },
  'sales-order': { key: 'salesOrder', color: '#52c41a' },
  'sales-outbound': { key: 'salesOutbound', color: '#faad14' },
  'sales-return': { key: 'salesReturn', color: '#ff4d4f' },
  'freight-bill': { key: 'freightBill', color: '#722ed1' },
}

const LINK_TYPE_KEYS: Readonly<Record<string, string>> = {
  入库: 'inbound',
  销售: 'sales',
  出库: 'outbound',
  退货: 'returns',
  物流: 'freight',
}

function formatMetric(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
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
  const typeLabelOf = (node: DocumentFlowNode) => {
    const meta = TYPE_META[node.type]
    return meta
      ? t(`documentFlow.types.${meta.key}`)
      : node.type || t('documentFlow.title')
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
      width="min(1280px, 94vw)"
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
            {t('documentFlow.documentCount', { count: nodes.length })}
            {isFetching ? ' …' : ''}
          </div>
          <div className="document-flow-viewport">
            <div
              className="document-flow-canvas"
              style={{ width: layout.width, height: layout.height }}
            >
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
                {layout.edges.map((edge) => (
                  <path
                    key={edge.key}
                    className="document-flow-edge"
                    d={edge.path}
                    markerEnd="url(#document-flow-arrow)"
                  />
                ))}
                {layout.edges.map((edge) =>
                  edge.linkType ? (
                    <text
                      key={`${edge.key}:label`}
                      className="document-flow-edge-label"
                      x={edge.labelX}
                      y={edge.labelY}
                      textAnchor="middle"
                    >
                      {LINK_TYPE_KEYS[edge.linkType]
                        ? t(
                            `documentFlow.linkTypes.${LINK_TYPE_KEYS[edge.linkType]}`,
                          )
                        : edge.linkType}
                    </text>
                  ) : null,
                )}
              </svg>
              {layout.nodes.map((item) => {
                const meta = TYPE_META[item.node.type]
                return (
                  <Tooltip key={item.key} title={nodeTooltip(item.node)}>
                    <button
                      type="button"
                      className="document-flow-node"
                      disabled={!onOpenNode}
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
                      <span
                        className="document-flow-node-type"
                        style={meta ? { color: meta.color } : undefined}
                      >
                        {typeLabelOf(item.node)}
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
                        {item.node.date ? <span>{item.node.date}</span> : null}
                      </span>
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
