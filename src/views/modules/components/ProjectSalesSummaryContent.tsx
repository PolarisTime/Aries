import { Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { ProjectSalesSummaryMetrics } from './ProjectSalesSummaryMetrics'
import { ProjectSalesSummaryQuota } from './ProjectSalesSummaryQuota'

interface Props {
  summary: ProjectSalesSummary
  variant: 'editor' | 'detail'
  pendingAmount?: number
  pendingTonnage?: number
}

/**
 * 面板的「有数据」分支：合同额度 + 分组指标 + 编辑器专属的「含本单」标注。
 *
 * <p>从 {@link ProjectSalesSummaryPanel} 拆出，一是把外壳的状态分支（加载/失败/无数据）
 * 与数据展示分开，二是让 shell 的控制流复杂度落在 react-doctor 阈值内。</p>
 *
 * <p>**不渲染后端 `summary.message`**：它的三种取值（额度充足 / 已超出… / 未关联有效合同）
 * 已经被本组件的本地化 UI 全部覆盖（进度条 + 超限 Alert + 无合同 Alert），再渲染一遍
 * 只会在英文界面里冒出中文重复句。字段仍保留在 schema 里（后端契约不动、保存前确认弹窗
 * 仍在消费），只是不在本面板展示。</p>
 */
export function ProjectSalesSummaryContent({
  summary,
  variant,
  pendingAmount,
  pendingTonnage,
}: Props) {
  const { t } = useTranslation()
  const showPending =
    variant === 'editor' &&
    (pendingAmount !== undefined || pendingTonnage !== undefined)

  return (
    <>
      <ProjectSalesSummaryQuota summary={summary} />
      <ProjectSalesSummaryMetrics summary={summary} />
      {showPending ? (
        <Typography.Text
          type="secondary"
          className="project-sales-summary__pending"
        >
          {t('modules.projectSalesSummary.pendingHint', {
            amount: formatAmount(pendingAmount ?? 0),
            tonnage: formatWeight(pendingTonnage ?? 0),
          })}
        </Typography.Text>
      ) : null}
    </>
  )
}
