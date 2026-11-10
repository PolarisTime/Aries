import { Card, Statistic } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ModuleRecord } from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'

/** 合计展示形态。 */
export type EditorItemsSummaryVariant = 'inline' | 'strip' | 'cards'

interface Props {
  items: ModuleRecord[]
  weightKey?: string
  amountKey?: string
  countKey?: string
  showAmount?: boolean
  /** 单据附加费用合计；大于 0 时并入「含附加费用合计」展示。 */
  expenseTotalAmount?: number | null
  className?: string
  /**
   * 展示形态：
   * - `inline`（默认）：标题行右侧的灰色内联文本，保持既有排版；
   * - `strip`：明细表格下方的合计栏，Statistic 横排；
   * - `cards`：明细表格上方的指标卡，每项一个 Statistic 卡片。
   */
  variant?: EditorItemsSummaryVariant
}

/** 明细汇总的口径结果；渲染层只消费它，不再各自求和。 */
export interface EditorItemsTotals {
  rowCount: number
  totalCount: number
  totalWeight: number
  goodsAmount: number
  expenseAmount: number
  grandTotalAmount: number
  hasExpense: boolean
}

interface TotalsOptions {
  weightKey?: string
  amountKey?: string
  countKey?: string
  expenseTotalAmount?: number | null
}

/**
 * 合计口径的**唯一计算出口**。
 *
 * <p>表格列、汇总条、指标卡、悬浮提示都从这里取数：同一张单据在不同出口出现两个数字，
 * 是历史上反复出现的缺陷（审查报告 P2-2）。新增渲染出口时不要再写一遍 `reduce`。</p>
 */
export function resolveEditorItemsTotals(
  items: ModuleRecord[],
  {
    weightKey = 'weightTon',
    amountKey = 'amount',
    countKey = 'quantity',
    expenseTotalAmount,
  }: TotalsOptions = {},
): EditorItemsTotals {
  const totalWeight = items.reduce(
    (sum, item) => sum + (Number(item[weightKey]) || 0),
    0,
  )
  const goodsAmount = items.reduce(
    (sum, item) => sum + (Number(item[amountKey]) || 0),
    0,
  )
  const totalCount = items.reduce(
    (sum, item) => sum + (Number(item[countKey]) || 0),
    0,
  )
  const expenseAmount = Number(expenseTotalAmount) || 0
  // 含附加费用合计 = 货物金额 + 附加费用；与列表「总金额」同一口径。
  return {
    rowCount: items.length,
    totalCount,
    totalWeight,
    goodsAmount,
    expenseAmount,
    grandTotalAmount: goodsAmount + expenseAmount,
    hasExpense: expenseAmount > 0,
  }
}

interface MetricProps {
  label: string
  value: string | number
  suffix?: string
  emphasis?: boolean
}

/** 单个指标：标题小字 + 大号数值。 */
function SummaryMetric({ label, value, suffix, emphasis }: MetricProps) {
  return (
    <Statistic
      className={`editor-items-metric${
        emphasis ? ' editor-items-metric--emphasis' : ''
      }`}
      title={label}
      value={value}
      /*
       * 数值一律走 formatAmount / formatWeight，并且**用 formatter 完全接管渲染**：
       * 两者都是 `useGrouping: false`（产品决定：金额便于复制进表格/搜索），
       * 而 Statistic 即使 value 传字符串也会套用内置分组（实测 136180.02 → 136,180.02），
       * 与表格列对不上。formatter 返回原样字符串即可，分组/精度全部由上层决定。
       */
      formatter={() => String(value)}
      {...(suffix
        ? { suffix: <span className="editor-items-metric-unit">{suffix}</span> }
        : {})}
    />
  )
}

/**
 * 编辑器明细汇总条。
 *
 * <p>**金额口径与格式的唯一出口在这里**：此前用 `totalAmount.toFixed(2)` 显示货物额
 * （`114868.08`），而同一条单据在列表里走 `formatAmount` 显示含附加费的总金额
 * （`115,868.08`）—— 同一张单据两处金额既差一笔费用、又差一个千分位，用户核对不上
 * （审查报告 P2-2）。现在：</p>
 *
 * - **货物金额**：只标口径（货物行合计），不再让「金额」这个含混词同时指两种口径；
 * - **含附加费用合计**：货物金额 + 附加费用合计，与列表「总金额」同口径；
 * - 两个数字都走 `formatAmount`（`src/utils/formatters.ts`），千分位与两位小数和表格
 *   列完全一致。不要在本文件里再写 `toFixed` / `toLocaleString`。
 *
 * <p>三种形态共用 {@link resolveEditorItemsTotals} 的结果，口径不会因展示形态而分叉。</p>
 */
export function EditorItemsSummary({
  items,
  weightKey = 'weightTon',
  amountKey = 'amount',
  countKey = 'quantity',
  showAmount = true,
  expenseTotalAmount,
  className,
  variant = 'inline',
}: Props) {
  const { t } = useTranslation()
  const totals = resolveEditorItemsTotals(items, {
    weightKey,
    amountKey,
    countKey,
    expenseTotalAmount,
  })

  if (variant === 'strip' || variant === 'cards') {
    const metrics: Array<MetricProps & { key: string }> = [
      {
        key: 'rows',
        label: t('modules.itemsSummary.rowCount'),
        value: totals.rowCount,
      },
    ]
    if (totals.totalCount > 0) {
      metrics.push({
        key: 'quantity',
        label: t('modules.itemsSummary.quantity'),
        value: totals.totalCount,
      })
    }
    if (totals.totalWeight > 0) {
      metrics.push({
        key: 'weight',
        label: t('modules.itemsSummary.weight'),
        value: formatWeight(totals.totalWeight),
        suffix: t('modules.units.ton'),
      })
    }
    if (showAmount && totals.goodsAmount > 0) {
      metrics.push({
        key: 'goodsAmount',
        label: t('modules.itemsSummary.goodsAmount'),
        value: formatAmount(totals.goodsAmount),
      })
    }
    if (showAmount && totals.hasExpense) {
      metrics.push({
        key: 'expenseAmount',
        label: t('modules.itemsSummary.expenseAmount'),
        value: formatAmount(totals.expenseAmount),
      })
      metrics.push({
        key: 'grandTotal',
        label: t('modules.itemsSummary.totalAmountWithExpense'),
        value: formatAmount(totals.grandTotalAmount),
        emphasis: true,
      })
    }

    const rootClass = [
      'editor-items-summary',
      `editor-items-summary--${variant}`,
      className || '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={rootClass}>
        {metrics.map(({ key, ...metric }) =>
          variant === 'cards' ? (
            <Card key={key} size="small" className="editor-items-metric-card">
              <SummaryMetric {...metric} />
            </Card>
          ) : (
            <SummaryMetric key={key} {...metric} />
          ),
        )}
      </div>
    )
  }

  return (
    <div
      className={['editor-items-summary', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <span>
        {t('modules.itemsSummary.rowCount')} {totals.rowCount}
      </span>
      {totals.totalCount > 0 && (
        <span>
          {t('modules.itemsSummary.quantity')} {totals.totalCount}
        </span>
      )}
      {totals.totalWeight > 0 && (
        <span>
          {t('modules.itemsSummary.weight')} {formatWeight(totals.totalWeight)}
        </span>
      )}
      {showAmount && totals.goodsAmount > 0 && (
        <span>
          {t('modules.itemsSummary.goodsAmount')}{' '}
          {formatAmount(totals.goodsAmount)}
        </span>
      )}
      {showAmount && totals.hasExpense && (
        <span>
          {t('modules.itemsSummary.expenseAmount')}{' '}
          {formatAmount(totals.expenseAmount)}
        </span>
      )}
      {showAmount && totals.hasExpense && (
        <span>
          {t('modules.itemsSummary.totalAmountWithExpense')}{' '}
          {formatAmount(totals.grandTotalAmount)}
        </span>
      )}
    </div>
  )
}
