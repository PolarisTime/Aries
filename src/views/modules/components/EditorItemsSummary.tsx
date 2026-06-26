import { useTranslation } from 'react-i18next'
import { DISPLAY_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  items: ModuleRecord[]
  weightKey?: string
  amountKey?: string
  countKey?: string
  showAmount?: boolean
  className?: string
}

export function EditorItemsSummary({
  items,
  weightKey = 'weightTon',
  amountKey = 'amount',
  countKey = 'quantity',
  showAmount = true,
  className,
}: Props) {
  const { t } = useTranslation()
  const totalWeight = items.reduce(
    (sum, item) => sum + (Number(item[weightKey]) || 0),
    0,
  )
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item[amountKey]) || 0),
    0,
  )
  const totalCount = items.reduce(
    (sum, item) => sum + (Number(item[countKey]) || 0),
    0,
  )

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
          {t('modules.itemsSummary.weight')}{' '}
          {totalWeight.toFixed(DISPLAY_WEIGHT_PRECISION)}
        </span>
      )}
      {showAmount && totalAmount > 0 && (
        <span>
          {t('modules.itemsSummary.amount')} {totalAmount.toFixed(2)}
        </span>
      )}
    </div>
  )
}
