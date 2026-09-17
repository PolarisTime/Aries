import { useQuery } from '@tanstack/react-query'
import { Descriptions, Space, Tag } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getSalesContract } from '@/api/sales/sales-contracts'
import { DetailSkeleton } from '@/components/loading/DetailSkeleton'
import { StatusTag } from '@/components/StatusTag'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import type { ModuleStatusMeta } from '@/types/module-page'
import { formatAmount, formatDate, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { SALES_CONTRACT_STATUS } from './sales-contract-model'

interface SalesContractDetailOverlayProps {
  contractId: string
  onClose: () => void
}

export function SalesContractDetailOverlay({
  contractId,
  onClose,
}: SalesContractDetailOverlayProps) {
  const { t } = useTranslation()
  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.salesContractDetail(contractId),
    queryFn: ({ signal }) => getSalesContract(contractId, signal),
    staleTime: STALE_REALTIME,
    enabled: Boolean(contractId),
  })

  const record = detailQuery.data
  const statusMap = useMemo<Record<string, ModuleStatusMeta>>(
    () => ({
      [SALES_CONTRACT_STATUS.DRAFT]: {
        text: t('modules.status.draft'),
        color: 'warning',
      },
      [SALES_CONTRACT_STATUS.REVIEWED]: {
        text: t('modules.status.reviewed'),
        color: 'processing',
      },
      [SALES_CONTRACT_STATUS.ISSUED]: {
        text: t('modules.status.issued'),
        color: 'cyan',
      },
      [SALES_CONTRACT_STATUS.ARCHIVED]: {
        text: t('modules.status.archived'),
        color: 'success',
      },
      [SALES_CONTRACT_STATUS.VOIDED]: {
        text: t('modules.status.voided'),
        color: 'error',
      },
    }),
    [t],
  )

  return (
    <WorkspaceOverlay
      open={Boolean(contractId)}
      title={t('modules.detail.titleSuffix')}
      onClose={onClose}
    >
      {detailQuery.isLoading ? (
        <DetailSkeleton />
      ) : detailQuery.error ? (
        <Tag color="red">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : t('api.loadFailed')}
        </Tag>
      ) : record ? (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label={t('modules.salesContract.contractNo')}>
            {asString(record.contractNo)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.name')}>
            {asString(record.name)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.customer')}>
            {asString(record.customerName) || '--'}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.project')}>
            {asString(record.projectName) || '--'}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.signDate')}>
            {formatDate(record.signDate)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.startDate')}>
            {formatDate(record.startDate)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.endDate')}>
            {formatDate(record.endDate)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.columns.status')}>
            <Space>
              <StatusTag
                status={asString(record.status)}
                statusMap={statusMap}
              />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.columns.totalAmount')}>
            {formatAmount(record.totalAmount)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.salesContract.totalTonnage')}>
            {formatWeight(record.totalTonnage)}
          </Descriptions.Item>
          <Descriptions.Item label={t('modules.columns.remark')} span={2}>
            {asString(record.remark) || '--'}
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </WorkspaceOverlay>
  )
}
