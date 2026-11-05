import { Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModuleDetailMetric, ModuleRecord } from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { useProjectSalesSummary } from '@/views/modules/use-project-sales-summary'
import { ModuleDetailMetricBar } from './ModuleDetailMetricBar'
import {
  formatUsagePercent,
  toBarPercent,
} from './project-sales-summary-display'

/**
 * 销售订单只读详情面（详情弹层 / 列表行「+」展开）顶部的四项指标条。
 *
 * <p>数据来自项目销售汇总接口（`GET /api/v2/projects/{projectId}/sales-summary`），
 * 请求出口只有 `useProjectSalesSummary` 一个；本组件只做「取数 + 选口径 + 排版」，
 * 不重复求和、不重复判定。</p>
 *
 * <p>三处格式化都复用既有唯一出口，禁止在这里另写算式：</p>
 * <ul>
 *   <li>金额 → {@link formatAmount}（2 位小数、无千分位）；</li>
 *   <li>重量 → {@link formatWeight}（3 位小数、无千分位）；</li>
 *   <li>使用率百分比 → {@link formatUsagePercent}（0.8532 → `85.32%`，无合同时 `—`）。</li>
 * </ul>
 *
 * <p>失效兜底：未选项目不渲染；加载失败整条不渲染（指标是增强信息，不能打断详情里的
 * 字段与明细）；只有「首次加载且尚无数据」才出骨架，避免每次重算都闪一下。</p>
 */
export function SalesOrderDetailMetrics({ record }: { record: ModuleRecord }) {
  const { t } = useTranslation()
  const ton = t('modules.units.ton')

  const projectId = asString(record.projectId).trim()
  /*
   * 详情面是「含本单」的项目口径：本单已保存、后端聚合里已经算过它，因此**不传**
   * excludeOrderId。「排除本单」只属于编辑器的 pending 口径（那张单还没保存，
   * 不排除就会和草稿合计重复计数），别在这里加回来 —— 加回来会让使用率与送货少算本单。
   */
  const { summary, loading, error } = useProjectSalesSummary({ projectId })

  // 未选项目：没有可汇总的对象。hook 内部按空 projectId 短路，这里只是不渲染。
  if (!projectId) return null
  if (error) return null
  if (loading && !summary) {
    return <Skeleton active title={false} paragraph={{ rows: 1 }} />
  }
  if (!summary) return null

  /*
   * 已用额度 = 合同 − 剩余。后端只下发 remaining*（剩余额度）与使用率，
   * 不下发「已用」绝对值；这里按同一恒等式还原，两个指标条（金额/吨位）共用一处推导，
   * 不在渲染分支里各写一遍。
   */
  const usedAmount = summary.contractAmount - summary.remainingAmount
  const usedTonnage = summary.contractTonnage - summary.remainingTonnage
  // 本单总重量来自单据本身（后端聚合的 totalWeight），不是明细行前端再求和。
  const orderTotalWeight = Number(record.totalWeight) || 0
  // 差额 = 项目已送货吨位 − 本单总重量（负值表示本单还没送完）。
  const deliveredGap = summary.deliveredTonnage - orderTotalWeight

  const metrics: ModuleDetailMetric[] = [
    {
      key: 'contractAmountUsage',
      label: t('modules.projectSalesSummary.amountUsage'),
      value: formatUsagePercent(summary.amountUsageRate),
      // 「已用金额：¥x / 合同金额：¥y」：两个数都带单位与名称，避免只看到一个比值。
      hint: `${t('modules.salesContractCheck.usedAmount', {
        value: `¥${formatAmount(usedAmount)}`,
      })} / ${t('modules.salesContractCheck.contractAmount', {
        value: `¥${formatAmount(summary.contractAmount)}`,
      })}`,
      // 无有效合同时使用率为 null，进度条没有分母，画出来是假的 0%，因此不给 percent。
      ...(summary.amountUsageRate === null
        ? {}
        : { percent: toBarPercent(summary.amountUsageRate) }),
    },
    {
      key: 'contractTonnageUsage',
      label: t('modules.projectSalesSummary.tonnageUsage'),
      value: formatUsagePercent(summary.tonnageUsageRate),
      hint: `${t('modules.salesContractCheck.usedTonnage', {
        value: `${formatWeight(usedTonnage)}${ton}`,
      })} / ${t('modules.salesContractCheck.contractTonnage', {
        value: `${formatWeight(summary.contractTonnage)}${ton}`,
      })}`,
      ...(summary.tonnageUsageRate === null
        ? {}
        : { percent: toBarPercent(summary.tonnageUsageRate) }),
    },
    {
      key: 'deliveredVsOrderWeight',
      /*
       * 两个数不同源，必须让读者一眼分清：前者是**项目汇总**的送货吨位（含其它单据），
       * 后者是**本单**的 totalWeight。label 用「合计送货吨位」点明聚合口径，
       * hint 再补一次括号说明，避免被读成「本单送货 / 本单总重量」。
       */
      label: `${t('modules.projectSalesSummary.deliveredTonnage')} / ${t('modules.columns.totalWeight')}`,
      value: `${formatWeight(summary.deliveredTonnage)} / ${formatWeight(orderTotalWeight)} ${ton}`,
      hint: `${t('modules.projectSalesSummary.deliveredTonnage')}（${t('modules.salesContract.project')}） − ${t('modules.columns.totalWeight')}（${t('modules.pages.salesOrder.title')}）：${formatWeight(deliveredGap)} ${ton}`,
    },
    {
      key: 'unreconciled',
      label: `${t('modules.projectSalesSummary.unreconciledAmount')} / ${t('modules.projectSalesSummary.unreconciledTonnage')}`,
      value: `¥${formatAmount(summary.unreconciledAmount)}`,
      hint: `${formatWeight(summary.unreconciledTonnage)} ${ton}`,
      // 未对账是「待办」性质：用 warning 语义色，不靠颜色单独传达（前面还有金额文本）。
      tone: 'warning',
    },
  ]

  return <ModuleDetailMetricBar metrics={metrics} />
}
