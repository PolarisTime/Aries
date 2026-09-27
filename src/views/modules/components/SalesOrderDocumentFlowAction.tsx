import { ApartmentOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Listy,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import '@/styles/sales-doc-flow.css'
import { useTranslation } from 'react-i18next'
import { getSalesOrderDocumentFlow } from '@/api/sales/sales-order-document-flow'
import { QUERY_KEYS } from '@/constants/query-keys'
import type {
  SalesOrderDocumentFlow,
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

/** 抽屉内容: 负责加载态、错误态、空态与分组/关系两段列表的组装。 */
function DocumentFlowDrawerBody({
  data,
  error,
  isError,
  isFetching,
  isPending,
  onRetry,
}: {
  data: SalesOrderDocumentFlow | undefined
  error: unknown
  isError: boolean
  isFetching: boolean
  isPending: boolean
  onRetry: () => void
}) {
  const { t } = useTranslation()
  const nodes = data?.nodes ?? []
  const links = data?.links ?? []
  const nodeGroups = useMemo(() => groupNodesByType(nodes), [nodes])
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [String(node.id), node])),
    [nodes],
  )
  const hasContent = nodes.length > 0 || links.length > 0
  return (
    <Spin spinning={isPending || isFetching}>
      {isError ? (
        <Alert
          action={
            <Button size="small" onClick={onRetry}>
              {t('errorBoundary.retry')}
            </Button>
          }
          title={
            error instanceof Error
              ? error.message
              : t('modules.pages.salesOrder.documentFlow.loadFailed')
          }
          showIcon
          type="error"
        />
      ) : null}
      {!isPending && nodes.length === 0 ? (
        <Empty description={t('modules.pages.salesOrder.documentFlow.empty')} />
      ) : null}
      {nodeGroups.map((group) => (
        <DocumentFlowNodeGroup key={group.type} group={group} />
      ))}
      {!isPending && hasContent ? (
        <div>
          <Typography.Title level={5}>
            {t('modules.pages.salesOrder.documentFlow.relationsTitle')}
          </Typography.Title>
          <DocumentFlowRelations links={links} nodeById={nodeById} />
        </div>
      ) : null}
    </Spin>
  )
}

/** 单据分组列表: 一组单据(同类型)的明细行。 */
function DocumentFlowNodeGroup({ group }: { group: NodeGroup }) {
  const { t } = useTranslation()
  if (group.nodes.length === 0) {
    return (
      <div>
        <Typography.Title level={5}>{group.type}</Typography.Title>
        <Typography.Text type="secondary">
          {t('modules.pages.salesOrder.documentFlow.emptySection')}
        </Typography.Text>
      </div>
    )
  }
  return (
    <div>
      <Typography.Title level={5}>{group.type}</Typography.Title>
      {/* List 已废弃, 按官方说明迁到 Listy: dataSource→items、renderItem→itemRender,
          预设的 List.Item.Meta 用普通标记在 itemRender 内重组。 */}
      <Listy<SalesOrderDocumentFlowNode>
        classNames={{ root: 'sales-doc-flow-list' }}
        items={group.nodes}
        rowKey="id"
        itemRender={(node) => (
          <div className="sales-doc-flow-row">
            <div className="sales-doc-flow-row-meta">
              <div className="sales-doc-flow-row-title">
                {node.no || String(node.id)}
              </div>
              <div className="sales-doc-flow-row-desc">{node.date || ''}</div>
            </div>
            {node.status ? <Tag>{node.status}</Tag> : null}
            {node.weight != null ? (
              <Typography.Text>{String(node.weight)}</Typography.Text>
            ) : null}
            {node.amount != null ? (
              <Typography.Text>{String(node.amount)}</Typography.Text>
            ) : null}
          </div>
        )}
      />
    </div>
  )
}

/** 单据关系列表: 关系行没有自有 id, 用两端 + 关系类型组合成稳定 key。 */
function DocumentFlowRelations({
  links,
  nodeById,
}: {
  links: SalesOrderDocumentFlowLink[]
  nodeById: Map<string, SalesOrderDocumentFlowNode>
}) {
  const { t } = useTranslation()
  if (links.length === 0) {
    return (
      <Typography.Text type="secondary">
        {t('modules.pages.salesOrder.documentFlow.relationsEmpty')}
      </Typography.Text>
    )
  }
  return (
    <Listy<SalesOrderDocumentFlowLink>
      classNames={{ root: 'sales-doc-flow-list' }}
      items={links}
      rowKey={(link) =>
        `${link.fromId ?? ''}-${link.toId ?? ''}-${link.linkType ?? ''}`
      }
      styles={{ item: { paddingBlock: 'var(--space-xs)' } }}
      itemRender={(link) => {
        const fromLabel = resolveLinkNodeLabel(link.fromId, nodeById)
        const toLabel = resolveLinkNodeLabel(link.toId, nodeById)
        return (
          <Space size="small" wrap>
            {link.fromType ? <Tag>{link.fromType}</Tag> : null}
            <Typography.Text>{fromLabel}</Typography.Text>
            <span className="aries-sr-only">
              {t('modules.pages.salesOrder.documentFlow.relationArrow')}
            </span>
            <ArrowRightOutlined aria-hidden="true" />
            {link.toType ? <Tag>{link.toType}</Tag> : null}
            <Typography.Text>{toLabel}</Typography.Text>
            {link.linkType ? <Tag color="blue">{link.linkType}</Tag> : null}
          </Space>
        )
      }}
    />
  )
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
        size={640}
        onClose={() => setOpen(false)}
      >
        <DocumentFlowDrawerBody
          data={data}
          error={error}
          isError={isError}
          isFetching={isFetching}
          isPending={isPending}
          onRetry={() => void refetch()}
        />
      </Drawer>
    </>
  )
}
