import { useTranslation } from 'react-i18next'
import type { ModuleRecord } from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'

interface Props {
  items: ModuleRecord[]
  weightKey?: string
  amountKey?: string
  countKey?: string
  showAmount?: boolean
  /** 单据附加费用合计；大于 0 时并入「含附加费用合计」展示。 */
  expenseTotalAmount?: number | null
  className?: string
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
 */
export function EditorItemsSummary({
  items,
  weightKey = 'weightTon',
  amountKey = 'amount',
  countKey = 'quantity',
  showAmount = true,
  expenseTotalAmount,
  className,
}: Props) {
  const { t } = useTranslation()
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
  const resolvedExpenseTotal = Number(expenseTotalAmount) || 0
  // 含附加费用合计 = 货物金额 + 附加费用；与列表「总金额」同一口径。
  const grandTotalAmount = goodsAmount + resolvedExpenseTotal

  return (
    <div
      className={['editor-items-summary', className || '']
        .filter(Boolean)
        .join(' ')}
    >
      <span>
        {t('modules.itemsSummary.rowCount')} {items.length}
      </span>
      {totalCount > 0 && (
        <span>
          {t('modules.itemsSummary.quantity')} {totalCount}
        </span>
      )}
      {totalWeight > 0 && (
        <span>
          {t('modules.itemsSummary.weight')} {formatWeight(totalWeight)}
        </span>
      )}
      {showAmount && goodsAmount > 0 && (
        <span>
          {t('modules.itemsSummary.goodsAmount')} {formatAmount(goodsAmount)}
        </span>
      )}
      {showAmount && resolvedExpenseTotal > 0 && (
        <span>
          {t('modules.itemsSummary.expenseAmount')}{' '}
          {formatAmount(resolvedExpenseTotal)}
        </span>
      )}
      {showAmount && resolvedExpenseTotal > 0 && (
        <span>
          {t('modules.itemsSummary.totalAmountWithExpense')}{' '}
          {formatAmount(grandTotalAmount)}
        </span>
      )}
    </div>
  )
}
