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

  // 三组指标压成一行内联小字：组名加粗，指标按「标签 数值」成对出现。
  // 不再用带标题的 bordered Descriptions —— 那张表会把每组撑成「一行标题 + 一行数据」，
  // 三组叠起来就是六行，和面板表头的小字单行密度对不上。
  const groups: Array<{
    key: string
    title: string
    items: Array<{ key: string; label: string; value: string }>
  }> = [
    {
      key: 'orders',
      title: t('modules.projectSalesSummary.groupOrders'),
      items: [
        {
          key: 'orderAmount',
          label: t('modules.projectSalesSummary.orderAmount'),
          value: formatAmount(summary.orderAmount),
        },
        {
          key: 'orderTonnage',
          label: t('modules.projectSalesSummary.orderTonnage'),
          value: formatWeight(summary.orderTonnage),
        },
      ],
    },
    {
      key: 'delivery',
      title: t('modules.projectSalesSummary.groupDelivery'),
      items: [
        {
          key: 'deliveredTonnage',
          label: t('modules.projectSalesSummary.deliveredTonnage'),
          value: formatWeight(summary.deliveredTonnage),
        },
      ],
    },
    {
      key: 'reconcile',
      title: t('modules.projectSalesSummary.groupReconcile'),
      items: [
        {
          key: 'unreconciledAmount',
          label: t('modules.projectSalesSummary.unreconciledAmount'),
          value: formatAmount(summary.unreconciledAmount),
        },
        {
          key: 'unreconciledTonnage',
          label: t('modules.projectSalesSummary.unreconciledTonnage'),
          value: formatWeight(summary.unreconciledTonnage),
        },
      ],
    },
  ]

  return (
    <div className="project-sales-summary__metrics">
      {groups.map((group) => (
        <div
          key={group.key}
          className={`project-sales-summary__metrics-group project-sales-summary__metrics-group--${group.key}`}
        >
          <span className="project-sales-summary__metrics-title">
            {group.title}
          </span>
          {group.items.map((item) => (
            <span
              key={item.key}
              className="project-sales-summary__metrics-item"
            >
              <span className="project-sales-summary__metrics-label">
                {item.label}
              </span>
              <span className="project-sales-summary__metrics-value">
                {item.value}
              </span>
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
