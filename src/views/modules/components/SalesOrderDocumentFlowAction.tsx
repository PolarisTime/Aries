import { ApartmentOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Drawer,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSalesOrderDocumentFlow } from '@/api/sales/sales-order-document-flow'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  SalesOrderDocumentFlowLink,
  SalesOrderDocumentFlowNode,
} from '@/shared/schemas/sales-order-document-flow'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  selectedRows: ModuleRecord[]
}

interface NodeGroup {
  type: string
  nodes: SalesOrderDocumentFlowNode[]
}

function groupNodesByType(nodes: SalesOrderDocumentFlowNode[]): NodeGroup[] {
  const groups = new Map<string, SalesOrderDocumentFlowNode[]>()
  for (const node of nodes) {
    const existing = groups.get(node.type)
    if (existing) {
      existing.push(node)
    } else {
      groups.set(node.type, [node])
    }
  }
  return Array.from(groups, ([type, groupedNodes]) => ({
    type,
    nodes: groupedNodes,
  }))
}

/** 关系端点标签：优先使用节点单据号，节点缺失时回退到原始 id。 */
function resolveLinkNodeLabel(
  nodeId: string | undefined,
  nodeById: Map<string, SalesOrderDocumentFlowNode>,
): string {
  if (!nodeId) {
    return '--'
  }
  const key = String(nodeId)
  return nodeById.get(key)?.no || key
}

export function SalesOrderDocumentFlowAction({ selectedRows }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const target = selectedRows.length === 1 ? selectedRows[0] : null
  const targetId = target ? String(target.id ?? '') : ''

  const { data, error, isError, isFetching, isPending, refetch } = useQuery({
    queryKey: QUERY_KEYS.salesOrderDocumentFlow(targetId),
    queryFn: ({ signal }) => getSalesOrderDocumentFlow(targetId, signal),
    enabled: open && Boolean(targetId),
    staleTime: 0,
  })

  const nodes = data?.nodes ?? []
  const links = data?.links ?? []
  const nodeGroups = useMemo(() => groupNodesByType(nodes), [nodes])
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [String(node.id), node])),
    [nodes],
  )
  const documentNo = String(target?.orderNo ?? '')
  const canOpen = selectedRows.length === 1
  const disabledReason = canOpen
    ? undefined
    : t('modules.pages.salesOrder.documentFlow.selectSingle')

  const handleOpen = () => {
    if (!targetId) {
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Tooltip title={disabledReason}>
        <Button
          aria-disabled={!canOpen}
          icon={<ApartmentOutlined />}
          onClick={handleOpen}
          style={canOpen ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}
        >
          {t('modules.pages.salesOrder.documentFlow.action')}
        </Button>
      </Tooltip>
      <Drawer
        open={open}
        title={t('modules.pages.salesOrder.documentFlow.title', {
          no: documentNo || '--',
        })}
        width={640}
        onClose={() => setOpen(false)}
      >
        <Spin spinning={isPending || isFetching}>
          {isError ? (
            <Alert
              action={
                <Button size="small" onClick={() => void refetch()}>
                  {t('errorBoundary.retry')}
                </Button>
              }
              message={
                error instanceof Error
                  ? error.message
                  : t('modules.pages.salesOrder.documentFlow.loadFailed')
              }
              showIcon
              type="error"
            />
          ) : null}
          {!isPending && nodes.length === 0 ? (
            <Empty
              description={t('modules.pages.salesOrder.documentFlow.empty')}
            />
          ) : null}
          {nodeGroups.map((group) => (
            <div key={group.type}>
              <Typography.Title level={5}>{group.type}</Typography.Title>
              <List
                bordered
                dataSource={group.nodes}
                locale={{
                  emptyText: t(
                    'modules.pages.salesOrder.documentFlow.emptySection',
                  ),
                }}
                renderItem={(node) => (
                  <List.Item>
                    <List.Item.Meta
                      title={node.no || String(node.id)}
                      description={node.date || ''}
                    />
                    {node.status ? <Tag>{node.status}</Tag> : null}
                    {node.weight != null ? (
                      <Typography.Text>{String(node.weight)}</Typography.Text>
                    ) : null}
                    {node.amount != null ? (
                      <Typography.Text>{String(node.amount)}</Typography.Text>
                    ) : null}
                  </List.Item>
                )}
              />
            </div>
          ))}
          {!isPending && (nodes.length > 0 || links.length > 0) ? (
            <div>
              <Typography.Title level={5}>
                {t('modules.pages.salesOrder.documentFlow.relationsTitle')}
              </Typography.Title>
              <List
                bordered
                size="small"
                dataSource={links}
                locale={{
                  emptyText: t(
                    'modules.pages.salesOrder.documentFlow.relationsEmpty',
                  ),
                }}
                renderItem={(link: SalesOrderDocumentFlowLink) => {
                  const fromLabel = resolveLinkNodeLabel(link.fromId, nodeById)
                  const toLabel = resolveLinkNodeLabel(link.toId, nodeById)
                  return (
                    <List.Item>
                      <Space size="small" wrap>
                        {link.fromType ? <Tag>{link.fromType}</Tag> : null}
                        <Typography.Text>{fromLabel}</Typography.Text>
                        <span className="aries-sr-only">
                          {t(
                            'modules.pages.salesOrder.documentFlow.relationArrow',
                          )}
                        </span>
                        <ArrowRightOutlined aria-hidden="true" />
                        {link.toType ? <Tag>{link.toType}</Tag> : null}
                        <Typography.Text>{toLabel}</Typography.Text>
                        {link.linkType ? (
                          <Tag color="blue">{link.linkType}</Tag>
                        ) : null}
                      </Space>
                    </List.Item>
                  )
                }}
              />
            </div>
          ) : null}
        </Spin>
      </Drawer>
    </>
  )
}
