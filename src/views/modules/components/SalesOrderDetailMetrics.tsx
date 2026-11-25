import { ClockCircleOutlined } from '@ant-design/icons'
import { Skeleton } from 'antd'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'
import type { ModuleDetailMetric } from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'
import { useProjectSalesSummary } from '@/views/modules/use-project-sales-summary'
import { ModuleDetailMetricBar } from './ModuleDetailMetricBar'
import {
  formatUsagePercent,
  isQuotaExceeded,
  toBarPercent,
} from './project-sales-summary-display'

/**
 * 销售订单只读详情面的四张指标卡（参考稿「顶栏卡」下方的指标区）。
 *
 * <p>数据来自项目销售汇总接口（`GET /api/v2/projects/{projectId}/sales-summary`），
 * 请求出口只有 `useProjectSalesSummary` 一个；本组件只做「取数 + 选口径 + 组卡」，
 * 不重复求和、不重复判定。</p>
 *
 * <p>格式化与判定全部复用既有唯一出口，禁止在这里另写算式：</p>
 * <ul>
 *   <li>金额 → {@link formatAmount}（2 位小数）；重量 → {@link formatWeight}（3 位小数）；</li>
 *   <li>使用率百分比 → {@link formatUsagePercent}（0.0344 → `3.44%`，无合同时 `—`）；</li>
 *   <li>进度条刻度 → {@link toBarPercent}（clamp 0~100，超限时 bar 填满、由百分比文本表达真实值）；</li>
 *   <li>是否超限 → {@link isQuotaExceeded}（判定基准是后端下发的 `exceeded*`，不是使用率）。</li>
 * </ul>
 *
 * <p>四张卡的内容：</p>
 * <ol>
 *   <li>合同金额使用率：健康胶囊 + 百分比 + 已用金额 + 6px 进度条 + 「总额 / 余」；</li>
 *   <li>合同吨位使用率：同结构，吨位口径；</li>
 *   <li>合计送货吨位 / 总重量：大号送货吨位 + 「/ 总重量 吨」 + 「交货差异率 → 差值（含在途）」；</li>
 *   <li>未对账汇总：琥珀整卡 + 金额 + 「未对账吨位」。</li>
 * </ol>
 *
 * <p>失效兜底：未选项目不渲染；加载失败整块不渲染（指标是增强信息，不能打断详情里的
 * 字段与明细）；只有「首次加载且尚无数据」才出骨架，避免每次重算都闪一下。</p>
 */
/**
 * 只声明本组件真正读取的两个字段：
 * 详情面传 `ModuleRecord`、编辑器传 `ModuleRecordInput`（新建时还没有 id），
 * 收窄到这两个字段后两个调用方都不需要额外断言。
 */
export interface SalesOrderMetricsRecord {
  projectId?: unknown
  totalWeight?: unknown
  /** 其余字段不读；保留索引签名让 ModuleRecord / ModuleRecordInput 都直接可传。 */
  [key: string]: unknown
}

interface Props {
  record: SalesOrderMetricsRecord
  /**
   * `editor` 变体：本单还没保存，项目汇总需要「排除本单 + 含本单草稿合计」的口径，
   * 并在卡片下方补一行 pending 说明；`detail` 变体（默认）只读，不传这些覆盖值。
   */
  variant?: 'detail' | 'editor'
  /** 编辑器：排除本单已保存的金额/吨位，避免与草稿合计重复计数。 */
  excludeOrderId?: string
  /** 编辑器：本单未保存的草稿合计，由调用方用 computeDraftTotals 算好下发。 */
  pendingAmount?: number
  pendingTonnage?: number
  /**
   * 本单总重量。详情面取 `record.totalWeight`（后端聚合值）；
   * 编辑器里单据还没保存，改传草稿合计吨位，否则「/ 总重量」恒为 0。
   */
  orderTotalWeight?: number
}

function OpeningBalanceSummaryStrip({
  openingReceivableAmount,
  openingAdvanceAmount,
  openingRemainingAmount,
  projectTotalDebtAmount,
}: {
  openingReceivableAmount: number
  openingAdvanceAmount: number
  openingRemainingAmount: number
  projectTotalDebtAmount: number
}) {
  const { t } = useTranslation()
  if (openingReceivableAmount <= 0 && openingAdvanceAmount <= 0) {
    return null
  }
  return (
    <div className="sales-order-metrics-hint">
      <span>
        {t('openingBalance.salesSummaryOpeningStrip', {
          openingRemaining: `¥${formatAmount(openingRemainingAmount)}`,
          openingAdvance: `¥${formatAmount(openingAdvanceAmount)}`,
          totalDebt: `¥${formatAmount(projectTotalDebtAmount)}`,
        })}
      </span>
    </div>
  )
}

function buildSalesOrderMetrics(
  summary: ProjectSalesSummary,
  currentOrderWeight: number,
  t: TFunction,
): ModuleDetailMetric[] {
  const ton = t('modules.units.ton')
  const usedAmount = summary.contractAmount - summary.remainingAmount
  const usedTonnage = summary.contractTonnage - summary.remainingTonnage

  const resolveCapsule = (
    exceeded: number,
    withinText: string,
    withinTone: 'processing' | 'success',
  ): ModuleDetailMetric['capsule'] => {
    if (isQuotaExceeded(exceeded)) {
      return { text: t('modules.detailCards.capsuleExceeded'), tone: 'warning' }
    }
    if (!summary.hasContract) return undefined
    return { text: withinText, tone: withinTone }
  }

  return [
    {
      key: 'contractAmountUsage',
      label: t('modules.projectSalesSummary.amountUsage'),
      tone: 'primary',
      capsule: resolveCapsule(
        summary.exceededAmount,
        t('modules.detailCards.capsuleHealthy'),
        'processing',
      ),
      value: formatUsagePercent(summary.amountUsageRate),
      subValue: t('modules.salesContractCheck.usedAmount', {
        value: `¥${formatAmount(usedAmount)}`,
      }),
      percent:
        summary.amountUsageRate === null
          ? undefined
          : toBarPercent(summary.amountUsageRate),
      stats: {
        left: {
          label: t('modules.detailCards.totalLabel'),
          value: `¥${formatAmount(summary.contractAmount)}`,
        },
        right: {
          label: t('modules.detailCards.remainingLabel'),
          value: `¥${formatAmount(summary.remainingAmount)}`,
        },
      },
    },
    {
      key: 'contractTonnageUsage',
      label: t('modules.projectSalesSummary.tonnageUsage'),
      tone: 'success',
      capsule: resolveCapsule(
        summary.exceededTonnage,
        t('modules.detailCards.capsuleSufficient'),
        'success',
      ),
      value: formatUsagePercent(summary.tonnageUsageRate),
      subValue: t('modules.salesContractCheck.usedTonnage', {
        value: `${formatWeight(usedTonnage)} ${ton}`,
      }),
      percent:
        summary.tonnageUsageRate === null
          ? undefined
          : toBarPercent(summary.tonnageUsageRate),
      stats: {
        left: {
          label: t('modules.detailCards.contractLabel'),
          value: `${formatWeight(summary.contractTonnage)} ${ton}`,
        },
        right: {
          label: t('modules.detailCards.remainingLabel'),
          value: `${formatWeight(summary.remainingTonnage)} ${ton}`,
        },
      },
    },
    {
      key: 'deliveredVsOrderWeight',
      label: `${t('modules.detailCards.orderWeight')} / ${t('modules.detailCards.projectDeliveredTonnage')}`,
      value: formatWeight(currentOrderWeight),
      subValue: `/ ${formatWeight(summary.deliveredTonnage)} ${ton}`,
    },
    {
      key: 'unreconciled',
      label: t('modules.detailCards.unreconciledSummary'),
      value: `¥${formatAmount(summary.unreconciledAmount)}`,
      tone: 'warning',
      icon: <ClockCircleOutlined />,
      stats: {
        left: { label: t('modules.projectSalesSummary.unreconciledTonnage') },
        right: {
          value: `${formatWeight(summary.unreconciledTonnage)} ${ton}`,
        },
      },
    },
  ]
}

function buildSummaryQueryOptions(
  projectId: string,
  excludeOrderId?: string,
  pendingAmount?: number,
  pendingTonnage?: number,
) {
  return {
    projectId,
    ...(excludeOrderId ? { excludeOrderId } : {}),
    ...(pendingAmount === undefined ? {} : { pendingAmount }),
    ...(pendingTonnage === undefined ? {} : { pendingTonnage }),
  }
}

function EditorPendingHint({
  pendingAmount,
  pendingTonnage,
  hasContract,
}: {
  pendingAmount?: number
  pendingTonnage?: number
  hasContract: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="sales-order-metrics-hint">
      <span>
        {t('modules.projectSalesSummary.pendingHint', {
          amount: formatAmount(pendingAmount ?? 0),
          tonnage: formatWeight(pendingTonnage ?? 0),
        })}
      </span>
      {hasContract ? null : (
        <span>{t('modules.projectSalesSummary.noContract')}</span>
      )}
    </div>
  )
}

function hasProjectOpeningBalance(summary: ProjectSalesSummary): boolean {
  return summary.openingReceivableAmount > 0 || summary.openingAdvanceAmount > 0
}

export function SalesOrderDetailMetrics({
  record,
  variant = 'detail',
  excludeOrderId,
  pendingAmount,
  pendingTonnage,
  orderTotalWeight,
}: Props) {
  const { t } = useTranslation()
  const projectId = asString(record.projectId).trim()
  const { summary, loading, error } = useProjectSalesSummary(
    buildSummaryQueryOptions(
      projectId,
      excludeOrderId,
      pendingAmount,
      pendingTonnage,
    ),
  )

  if (!projectId || error) return null
  if (loading && !summary) {
    return <Skeleton active title={false} paragraph={{ rows: 1 }} />
  }
  if (!summary) return null

  const currentOrderWeight =
    orderTotalWeight ?? (Number(record.totalWeight) || 0)
  const bar = (
    <ModuleDetailMetricBar
      metrics={buildSalesOrderMetrics(summary, currentOrderWeight, t)}
    />
  )
  const openingStrip = (
    <OpeningBalanceSummaryStrip
      openingReceivableAmount={summary.openingReceivableAmount}
      openingAdvanceAmount={summary.openingAdvanceAmount}
      openingRemainingAmount={summary.openingRemainingAmount}
      projectTotalDebtAmount={summary.projectTotalDebtAmount}
    />
  )

  if (variant !== 'editor' && !hasProjectOpeningBalance(summary)) {
    return bar
  }

  return (
    <div className="sales-order-metrics-with-hint">
      {bar}
      {openingStrip}
      {variant === 'editor' ? (
        <EditorPendingHint
          pendingAmount={pendingAmount}
          pendingTonnage={pendingTonnage}
          hasContract={summary.hasContract}
        />
      ) : null}
    </div>
  )
}
