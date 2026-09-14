import { ApartmentOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Drawer, Empty, List, Spin, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getSalesOrderDocumentFlow } from '@/api/sales/sales-order-document-flow'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { SalesOrderDocumentFlowNode } from '@/shared/schemas/sales-order-document-flow'
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
  const nodeGroups = useMemo(() => groupNodesByType(nodes), [nodes])
  const documentNo = String(target?.orderNo ?? '')

  const handleOpen = () => {
    if (!targetId) {
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button
        disabled={selectedRows.length !== 1}
        icon={<ApartmentOutlined />}
        onClick={handleOpen}
        title={
          selectedRows.length === 1
            ? undefined
            : t('modules.pages.salesOrder.documentFlow.selectSingle')
        }
      >
        {t('modules.pages.salesOrder.documentFlow.action')}
      </Button>
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
        </Spin>
      </Drawer>
    </>
  )
}
