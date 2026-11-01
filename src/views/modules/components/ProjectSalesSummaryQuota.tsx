import { Alert, Progress } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import { formatAmount, formatWeight } from '@/utils/formatters'
import {
  formatUsagePercent,
  isQuotaExceeded,
  toBarPercent,
} from './project-sales-summary-display'

interface QuotaRowProps {
  /** 行标签（合同金额使用率 / 合同吨位使用率）。 */
  label: string
  /** 进度条的可访问名：读屏必须能分辨是哪一条额度。 */
  ariaLabel: string
  rate: number | null
  contractText: string
  remainingText: string
}

/**
 * 单条合同额度进度条。
 *
 * <p>`showInfo={false}` 是有意的：超限时 antd 会把百分比文本替换成红色关闭图标，
 * 那样「> 100% 的具体数值」就只剩颜色可读（WCAG 1.4.1 只靠颜色传达信息）。
 * 这里改为始终在右侧渲染百分比文本，颜色只作为附加提示。</p>
 */
function QuotaRow({
  label,
  ariaLabel,
  rate,
  contractText,
  remainingText,
}: QuotaRowProps) {
  const exceeded = isQuotaExceeded(rate)
  return (
    <div className="project-sales-summary__quota-row">
      <div className="project-sales-summary__quota-head">
        <span className="project-sales-summary__quota-label">{label}</span>
        <span
          className={`project-sales-summary__quota-percent${
            exceeded ? ' project-sales-summary__quota-percent--exceeded' : ''
          }`}
        >
          {formatUsagePercent(rate)}
        </span>
      </div>
      <Progress
        className="project-sales-summary__quota-progress"
        percent={toBarPercent(rate)}
        status={exceeded ? 'exception' : 'normal'}
        showInfo={false}
        aria-label={ariaLabel}
      />
      <div className="project-sales-summary__quota-detail">
        <span>{contractText}</span>
        <span>{remainingText}</span>
      </div>
    </div>
  )
}

interface Props {
  summary: ProjectSalesSummary
}

/**
 * 合同额度区：两条进度条（金额 / 吨位）+ 剩余额度 + 超限提示。
 *
 * <p>无有效合同时不渲染进度条（进度条没有分母，画出来是假的 0%），改为一条说明，
 * 其余指标由 {@link ProjectSalesSummaryMetrics} 照常展示。</p>
 */
export function ProjectSalesSummaryQuota({ summary }: Props) {
  const { t } = useTranslation()

  if (!summary.hasContract) {
    return (
      <Alert
        className="project-sales-summary__no-contract"
        type="info"
        showIcon
        title={t('modules.projectSalesSummary.noContract')}
      />
    )
  }

  const exceededLines = [
    summary.exceededAmount > 0
      ? t('modules.projectSalesSummary.exceededAmount', {
          value: formatAmount(summary.exceededAmount),
        })
      : null,
    summary.exceededTonnage > 0
      ? t('modules.projectSalesSummary.exceededTonnage', {
          value: formatWeight(summary.exceededTonnage),
        })
      : null,
  ].filter((line): line is string => line !== null)

  return (
    <div className="project-sales-summary__quota">
      <QuotaRow
        label={t('modules.projectSalesSummary.amountUsage')}
        ariaLabel={t('modules.projectSalesSummary.amountUsageAria')}
        rate={summary.amountUsageRate}
        contractText={t('modules.projectSalesSummary.contractAmount', {
          value: formatAmount(summary.contractAmount),
        })}
        remainingText={t('modules.projectSalesSummary.remainingAmount', {
          value: formatAmount(summary.remainingAmount),
        })}
      />
      <QuotaRow
        label={t('modules.projectSalesSummary.tonnageUsage')}
        ariaLabel={t('modules.projectSalesSummary.tonnageUsageAria')}
        rate={summary.tonnageUsageRate}
        contractText={t('modules.projectSalesSummary.contractTonnage', {
          value: formatWeight(summary.contractTonnage),
        })}
        remainingText={t('modules.projectSalesSummary.remainingTonnage', {
          value: formatWeight(summary.remainingTonnage),
        })}
      />
      {exceededLines.length ? (
        <Alert
          className="project-sales-summary__exceeded"
          type="error"
          showIcon
          title={t('modules.projectSalesSummary.exceededTitle')}
          description={
            <div>
              {exceededLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          }
        />
      ) : null}
    </div>
  )
}
