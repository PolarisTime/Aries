import { useQuery } from '@tanstack/react-query'
import { Card, Spin, Table, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleRecord } from '@/types/module-page'
import { asId, asString } from '@/utils/type-narrowing'
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
      title: t('modules.freightPickup.pickupLocation'),
      dataIndex: 'warehouseName',
      width: 140,
      render: (v: unknown) => resolveDisplayText(v),
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

function resolveDisplayText(value: unknown, fallback = '-') {
  const text = asString(value).trim()
  return text || fallback
}

function groupItemsByProject(
  items: ModuleRecord[],
  fallbackProjectName: unknown,
) {
  const groups: Array<{ projectName: string; items: ModuleRecord[] }> = []
  const groupMap = new Map<string, ModuleRecord[]>()
  const fallback = resolveDisplayText(fallbackProjectName)

  for (const item of items) {
    const projectName = resolveDisplayText(item.projectName, fallback)
    const groupItems = groupMap.get(projectName)
    if (groupItems) {
      groupItems.push(item)
    } else {
      const nextItems = [item]
      groupMap.set(projectName, nextItems)
      groups.push({ projectName, items: nextItems })
    }
  }

  return groups
}

function DetailCard({ record }: { record: ModuleRecord }) {
  const { t } = useTranslation()
  const itemColumns = getItemColumns(t)
  const items = (
    Array.isArray(record.items) ? record.items : []
  ) as ModuleRecord[]
  const itemGroups = groupItemsByProject(items, record.projectName)

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
      {itemGroups.map((group) => (
        <div key={group.projectName} className="mb-3 last:mb-0">
          <div className="mb-2">
            <Typography.Text type="secondary">
              {t('modules.freightPickup.project')}：
            </Typography.Text>
            <Typography.Text strong>{group.projectName}</Typography.Text>
          </div>
          <Table
            rowKey="id"
            columns={itemColumns}
            dataSource={group.items}
            size="small"
            pagination={false}
          />
        </div>
      ))}
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
