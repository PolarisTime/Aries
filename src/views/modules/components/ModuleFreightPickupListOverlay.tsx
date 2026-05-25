import { useQuery } from '@tanstack/react-query'
import Card from 'antd/es/card'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { listAllBusinessModuleRows } from '@/api/business'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleRecord } from '@/types/module-page'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  moduleKey: string
  onClose: () => void
}

const LIST_COLUMNS = [
  { dataIndex: 'billNo', title: '运单号', width: 160 },
  { dataIndex: 'carrierName', title: '物流方', width: 120 },
  { dataIndex: 'vehiclePlate', title: '车牌号', width: 100 },
  { dataIndex: 'customerName', title: '客户', width: 140, ellipsis: true },
  { dataIndex: 'projectName', title: '项目', width: 160, ellipsis: true },
  {
    dataIndex: 'status', title: '状态', width: 80,
    render: (v: string) => <Tag color={v === '已送达' ? 'green' : 'processing'}>{v}</Tag>,
  },
]

const ITEM_COLUMNS = [
  { title: '品牌', dataIndex: 'brand', ellipsis: true, align: 'center' as const },
  { title: '材质', dataIndex: 'material', ellipsis: true, align: 'center' as const },
  { title: '规格', dataIndex: 'spec', ellipsis: true, align: 'center' as const },
  { title: '长度', dataIndex: 'length', ellipsis: true, align: 'center' as const },
  { title: '数量', dataIndex: 'quantity', align: 'center' as const },
  {
    title: '总重(吨)', dataIndex: 'weightTon', align: 'center' as const,
    render: (v: unknown) => (v != null ? Number(v).toFixed(3) : '-'),
  },
]

interface DetailCardProps {
  record: ModuleRecord
}
function DetailCard({ record }: DetailCardProps) {
  const fields: [string, string][] = [
    ['运单号', 'billNo'],
    ['物流方', 'carrierName'],
    ['车牌号', 'vehiclePlate'],
    ['客户', 'customerName'],
    ['项目', 'projectName'],
    ['出库单号', 'sourceNo'],
  ]
  const items = (Array.isArray(record.items) ? record.items : []) as ModuleRecord[]

  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: items.length > 0 ? 12 : 0 }}>
        {fields.map(([label, key]) => {
          const val = record[key]
          if (val == null || val === '') return null
          return (
            <span key={key}>
              <Typography.Text type="secondary">{label}：</Typography.Text>
              <Typography.Text strong>{String(val)}</Typography.Text>
            </span>
          )
        })}
        <span>
          <Typography.Text type="secondary">总重(吨)：</Typography.Text>
          <Typography.Text strong>
            {record.totalWeight != null ? Number(record.totalWeight).toFixed(3) : '-'}
          </Typography.Text>
        </span>
        <span>
          <Typography.Text type="secondary">总运费：</Typography.Text>
          <Typography.Text strong>
            {record.totalFreight != null ? Number(record.totalFreight).toFixed(2) : '-'}
          </Typography.Text>
        </span>
      </div>
      {items.length > 0 ? (
        <Table
          rowKey="id"
          columns={ITEM_COLUMNS}
          dataSource={items}
          size="small"
          pagination={false}
        />
      ) : null}
    </Card>
  )
}

export function ModuleFreightPickupListOverlay({
  open,
  moduleKey,
  onClose,
}: Props) {
  const { data: records, isLoading } = useQuery<ModuleRecord[]>({
    queryKey: QUERY_KEYS.freightPickup(moduleKey),
    queryFn: () => listAllBusinessModuleRows('freight-bill', {}),
    enabled: open,
  })

  const detailMode = (records?.length ?? 0) <= 10

  return (
    <WorkspaceOverlay
      title="提货清单 — 物流单"
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(94vw, 1120px)"
      height="min(84vh, 780px)"
      zIndex={1050}
    >
      {detailMode ? (
        <div style={{ overflow: 'auto', flex: 1 }}>
          {(records ?? []).map((record) => (
            <DetailCard key={record.id as string | number} record={record} />
          ))}
        </div>
      ) : (
        <Table
          rowKey="id"
          columns={LIST_COLUMNS}
          dataSource={records || []}
          loading={isLoading}
          size="small"
          scroll={{ x: 960 }}
          pagination={{ pageSize: 20 }}
        />
      )}
    </WorkspaceOverlay>
  )
}
