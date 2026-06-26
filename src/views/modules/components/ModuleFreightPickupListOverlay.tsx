import { useQuery } from '@tanstack/react-query'
import Card from 'antd/es/card'
import Spin from 'antd/es/spin'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleRecord } from '@/types/module-page'
import { asId } from '@/utils/type-narrowing'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  moduleKey: string
  records: ModuleRecord[]
  onClose: () => void
}

function getItemColumns(t: (key: string) => string) {
  return [
    {
      title: t('modules.itemColumns.sourceNo'),
      dataIndex: 'sourceNo',
      width: 140,
    },
    {
      title: t('modules.itemColumns.brand'),
      dataIndex: 'brand',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.material'),
      dataIndex: 'material',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.spec'),
      dataIndex: 'spec',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.length'),
      dataIndex: 'length',
      ellipsis: true,
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.quantity'),
      dataIndex: 'quantity',
      align: 'center' as const,
    },
    {
      title: t('modules.itemColumns.weightTon'),
      dataIndex: 'weightTon',
      align: 'center' as const,
      render: (v: unknown) =>
        v != null ? Number(v).toFixed(DISPLAY_WEIGHT_PRECISION) : '-',
    },
  ]
}

function DetailCard({ record }: { record: ModuleRecord }) {
  const { t } = useTranslation()
  const itemColumns = getItemColumns(t)
  const items = (
    Array.isArray(record.items) ? record.items : []
  ) as ModuleRecord[]

  return (
    <Card size="small" className="mb-3">
      <div className={items.length > 0 ? 'mb-3' : ''}>
        <div className="mb-1">
          <Typography.Text type="secondary">
            {t('modules.freightPickup.billNo')}：
          </Typography.Text>
          <Typography.Text strong>
            {String(record.billNo ?? '-')}
          </Typography.Text>
        </div>
        <div className="mb-1">
          <Typography.Text type="secondary">
            {t('modules.freightPickup.customer')}：
          </Typography.Text>
          <Typography.Text strong>
            {String(record.customerName ?? '-')}
          </Typography.Text>
          <span className="ml-6">
            <Typography.Text type="secondary">
              {t('modules.freightPickup.project')}：
            </Typography.Text>
            <Typography.Text strong>
              {String(record.projectName ?? '-')}
            </Typography.Text>
          </span>
        </div>
        <div>
          <Typography.Text type="secondary">
            {t('modules.freightPickup.carrier')}：
          </Typography.Text>
          <Typography.Text strong>
            {String(record.carrierName ?? '-')}
          </Typography.Text>
          <span className="ml-6">
            <Typography.Text type="secondary">
              {t('modules.freightPickup.vehiclePlate')}：
            </Typography.Text>
            <Typography.Text strong>
              {String(record.vehiclePlate ?? '-')}
            </Typography.Text>
          </span>
          <span className="ml-6">
            <Typography.Text type="secondary">
              {t('modules.freightPickup.totalWeight')}：
            </Typography.Text>
            <Typography.Text strong>
              {record.totalWeight != null
                ? Number(record.totalWeight).toFixed(DISPLAY_WEIGHT_PRECISION)
                : '-'}
            </Typography.Text>
          </span>
          <span className="ml-6">
            <Typography.Text type="secondary">
              {t('modules.freightPickup.totalFreight')}：
            </Typography.Text>
            <Typography.Text strong>
              {record.totalFreight != null
                ? Number(record.totalFreight).toFixed(2)
                : '-'}
            </Typography.Text>
          </span>
        </div>
      </div>
      {items.length > 0 ? (
        <Table
          rowKey="id"
          columns={itemColumns}
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
  records,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const recordIds = records.map((r) => String(r.id))

  const { data: fullRecords, isLoading } = useQuery({
    queryKey: [...QUERY_KEYS.freightPickup(moduleKey), ...recordIds],
    queryFn: async () => {
      const results = await Promise.all(
        recordIds.map((id) => getBusinessModuleDetail(moduleKey, id)),
      )
      return results.map((r) => r.data)
    },
    enabled: open && recordIds.length > 0,
  })

  const displayRecords = fullRecords ?? records

  return (
    <WorkspaceOverlay
      title={t('modules.freightPickup.title', { count: records.length })}
      open={open}
      onClose={onClose}
      variant="workspace"
      width="min(94vw, 1120px)"
      className="workspace-overlay-panel--fit-content"
      zIndex={1050}
    >
      <Spin spinning={isLoading}>
        {displayRecords.map((record) => (
          <DetailCard key={asId(record.id)} record={record} />
        ))}
      </Spin>
    </WorkspaceOverlay>
  )
}
