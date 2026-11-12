import { ClockCircleOutlined } from '@ant-design/icons'
import { Skeleton } from 'antd'
import { useTranslation } from 'react-i18next'
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

/** 需要带符号展示的差异值：正数补 `+`（`-13.484` 自带符号，不重复补）。 */
function formatSignedWeight(value: number, unit: string): string {
  const text = formatWeight(value)
  return `${value > 0 ? '+' : ''}${text} ${unit}`
}

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

export function SalesOrderDetailMetrics({
  record,
  variant = 'detail',
  excludeOrderId,
  pendingAmount,
  pendingTonnage,
  orderTotalWeight,
}: Props) {
  const { t } = useTranslation()
  const ton = t('modules.units.ton')

  const projectId = asString(record.projectId).trim()
  /*
   * 详情面是「含本单」的项目口径：本单已保存、后端聚合里已经算过它，因此**不传**
   * excludeOrderId。「排除本单」只属于编辑器的 pending 口径（那张单还没保存，
   * 不排除就会和草稿合计重复计数），别在这里加回来 —— 加回来会让使用率与送货少算本单。
   */
  const { summary, loading, error } = useProjectSalesSummary({
    projectId,
    ...(excludeOrderId ? { excludeOrderId } : {}),
    ...(pendingAmount === undefined ? {} : { pendingAmount }),
    ...(pendingTonnage === undefined ? {} : { pendingTonnage }),
  })

  // 未选项目：没有可汇总的对象。hook 内部按空 projectId 短路，这里只是不渲染。
  if (!projectId) return null
  if (error) return null
  if (loading && !summary) {
    return <Skeleton active title={false} paragraph={{ rows: 1 }} />
  }
  if (!summary) return null

  /*
   * 已用额度 = 合同 − 剩余。后端只下发 remaining*（剩余额度）与使用率，
   * 不下发「已用」绝对值；这里按同一恒等式还原，金额/吨位两张卡共用一处推导，
   * 不在渲染分支里各写一遍。
   */
  const usedAmount = summary.contractAmount - summary.remainingAmount
  const usedTonnage = summary.contractTonnage - summary.remainingTonnage
  /*
   * 本单总重量：详情面取单据字段（后端聚合的 totalWeight）；编辑器里单据还没保存，
   * 由调用方传草稿合计吨位进来 —— 两条路径都不在前端重新 reduce 明细。
   */
  const currentOrderWeight =
    orderTotalWeight ?? (Number(record.totalWeight) || 0)
  /*
   * 送货差异 = 合计送货吨位 − 本单总重量（正数表示项目送货多于本单订货，含在途）。
   * 两个数同源同上：都取汇总接口与本单记录，不在别处再算一遍。
   */
  const deliveryVariance = summary.deliveredTonnage - currentOrderWeight

  /*
   * 胶囊文案的唯一出口：只有后端下发的 exceeded* 才判「超支」，其余（含无合同、使用率
   * 缺失）都不给胶囊 —— 没有数据时宁可不显示，也不要凭空判个「健康」。
   */
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

  const metrics: ModuleDetailMetric[] = [
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
      /* 副值放「已用」绝对值：使用率单独看没有量级感，分子必须挨着它 */
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
      /*
       * 两个数不同源，必须让读者一眼分清：主值是**项目汇总**的合计送货吨位（含其它单据），
       * 副值是本单的 totalWeight。label 保留「合计送货吨位」点明聚合口径。
       */
      label: `${t('modules.projectSalesSummary.deliveredTonnage')} / ${t('modules.columns.totalWeight')}`,
      value: formatWeight(summary.deliveredTonnage),
      subValue: `/ ${formatWeight(currentOrderWeight)} ${ton}`,
      stats: {
        left: { label: t('modules.detailCards.deliveryVariance') },
        right: {
          /*
           * 蓝色差异值：用 CSS 类取 `--ant-color-primary-active`（深一档主色，
           * 对白底 6.16:1 达 AA），不在这里写死色值、也不读 theme token 传入。
           */
          value: (
            <span className="module-detail-metric__stat-emphasis">
              {t('modules.detailCards.varianceInTransit', {
                value: formatSignedWeight(deliveryVariance, ton),
              })}
            </span>
          ),
        },
      },
    },
    {
      key: 'unreconciled',
      label: t('modules.detailCards.unreconciledSummary'),
      value: `¥${formatAmount(summary.unreconciledAmount)}`,
      // 未对账是「待办」性质：整卡 amber（底色 + 描边 + 文字），不靠颜色单独传达语义。
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

  const bar = <ModuleDetailMetricBar metrics={metrics} />

  if (variant !== 'editor') {
    return bar
  }

  /*
   * 编辑器专属说明（详情面不需要）：
   * - 「含本单未保存合计」解释这批数字里有多少还没落库；
   * - 「该项目未关联有效销售合同」解释使用率为什么是 `—`，避免被当成数据缺失。
   * 两行都放在指标条**下方**，不占卡片区的高度，也不再单独画一个边框面板。
   */
  return (
    <div className="sales-order-metrics-with-hint">
      {bar}
      <div className="sales-order-metrics-hint">
        <span>
          {t('modules.projectSalesSummary.pendingHint', {
            amount: formatAmount(pendingAmount ?? 0),
            tonnage: formatWeight(pendingTonnage ?? 0),
          })}
        </span>
        {summary.hasContract ? null : (
          <span>{t('modules.projectSalesSummary.noContract')}</span>
        )}
      </div>
    </div>
  )
}
