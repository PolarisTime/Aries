import { WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Descriptions, Space, Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { getProjectOpeningBalanceSummary } from '@/api/finance/project-opening-balances'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useAuthStore } from '@/stores/authStore'
import { formatAmount } from '@/utils/formatters'
import { hasPermission } from '@/utils/permission'
import { buildRouterHref } from '@/utils/router-search'
import { asString } from '@/utils/type-narrowing'
import { PROJECT_OPENING_BALANCE_PERMISSIONS } from '@/views/finance/project-opening-balance-model'

/**
 * 项目资料详情页附加块：展示该项目的已确认期初往来汇总并提供直达「项目期初往来」台账入口。
 */
export function ProjectOpeningBalanceDetailSection({
  projectId,
}: {
  projectId: unknown
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const permissions = useAuthStore((state) => state.user?.permissions)
  const canReadOpeningBalance = hasPermission(
    permissions,
    PROJECT_OPENING_BALANCE_PERMISSIONS.READ,
  )
  const normalizedProjectId = asString(projectId).trim()

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.projectOpeningBalancesSummary({
      projectId: normalizedProjectId,
    }),
    queryFn: ({ signal }) =>
      getProjectOpeningBalanceSummary(
        { projectId: normalizedProjectId },
        signal,
      ),
    enabled: Boolean(normalizedProjectId) && canReadOpeningBalance,
  })

  if (!normalizedProjectId || !canReadOpeningBalance) {
    return null
  }

  const summary = summaryQuery.data

  return (
    <Card
      size="small"
      style={{ marginTop: 12 }}
      title={
        <Space size={8}>
          <WalletOutlined />
          <span>{t('openingBalance.projectDetailCardTitle')}</span>
          {summary && summary.draftCount > 0 ? (
            <Tag color="orange">
              {t('openingBalance.draftCountTag', { count: summary.draftCount })}
            </Tag>
          ) : null}
        </Space>
      }
      extra={
        <Button
          type="link"
          size="small"
          onClick={() => {
            void navigate({
              to: buildRouterHref('/project-opening-balance', {
                projectId: normalizedProjectId,
              }),
            } as never)
          }}
        >
          {t('openingBalance.manageForProject')}
        </Button>
      }
      loading={summaryQuery.isLoading}
    >
      <Descriptions
        size="small"
        column={{ xs: 1, sm: 2, md: 4 }}
        items={[
          {
            key: 'receivable',
            label: t('openingBalance.summaryReceivable'),
            children: `¥${formatAmount(summary?.openingReceivableAmount ?? 0)}`,
          },
          {
            key: 'settled',
            label: t('openingBalance.summarySettled'),
            children: `¥${formatAmount(summary?.openingSettledAmount ?? 0)}`,
          },
          {
            key: 'remaining',
            label: t('openingBalance.summaryRemaining'),
            children: `¥${formatAmount(summary?.openingRemainingAmount ?? 0)}`,
          },
          {
            key: 'advance',
            label: t('openingBalance.summaryAdvance'),
            children: `¥${formatAmount(summary?.openingAdvanceAmount ?? 0)}`,
          },
        ]}
      />
    </Card>
  )
}
