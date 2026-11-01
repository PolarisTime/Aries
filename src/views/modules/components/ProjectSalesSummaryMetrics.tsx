import type { DescriptionsProps } from 'antd'
import { Descriptions } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import { formatAmount, formatWeight } from '@/utils/formatters'

interface Props {
  summary: ProjectSalesSummary
}

/**
 * 分组指标：订单合计 / 送货 / 对账情况。
 *
 * <p>数值一律来自后端汇总响应，前端不再对明细行求和 —— 否则「合计金额」会同时存在
 * 「后端聚合」与「前端 reduce」两个来源，含本单/pending 时必然对不上。</p>
 *
 * <p>送货单独成组：`deliveredTonnage` 不是「订单合计」的一部分（它来自已审核销售出库
 * 减退货），放进 `groupOrders` 会让同一组里的两个数字语义不同。</p>
 */
export function ProjectSalesSummaryMetrics({ summary }: Props) {
  const { t } = useTranslation()

  const orderItems: DescriptionsProps['items'] = [
    {
      key: 'orderAmount',
      label: t('modules.projectSalesSummary.orderAmount'),
      children: formatAmount(summary.orderAmount),
    },
    {
      key: 'orderTonnage',
      label: t('modules.projectSalesSummary.orderTonnage'),
      children: formatWeight(summary.orderTonnage),
    },
  ]

  const deliveryItems: DescriptionsProps['items'] = [
    {
      key: 'deliveredTonnage',
      label: t('modules.projectSalesSummary.deliveredTonnage'),
      children: formatWeight(summary.deliveredTonnage),
    },
  ]

  const reconcileItems: DescriptionsProps['items'] = [
    {
      key: 'unreconciledAmount',
      label: t('modules.projectSalesSummary.unreconciledAmount'),
      children: formatAmount(summary.unreconciledAmount),
    },
    {
      key: 'unreconciledTonnage',
      label: t('modules.projectSalesSummary.unreconciledTonnage'),
      children: formatWeight(summary.unreconciledTonnage),
    },
  ]

  return (
    <div className="project-sales-summary__metrics">
      <Descriptions
        className="project-sales-summary__metrics-group"
        bordered
        size="small"
        column={{ xs: 1, sm: 2 }}
        title={t('modules.projectSalesSummary.groupOrders')}
        items={orderItems}
      />
      <Descriptions
        className="project-sales-summary__metrics-group"
        bordered
        size="small"
        column={{ xs: 1, sm: 2 }}
        title={t('modules.projectSalesSummary.groupDelivery')}
        items={deliveryItems}
      />
      <Descriptions
        className="project-sales-summary__metrics-group"
        bordered
        size="small"
        column={{ xs: 1, sm: 2 }}
        title={t('modules.projectSalesSummary.groupReconcile')}
        items={reconcileItems}
      />
    </div>
  )
}
