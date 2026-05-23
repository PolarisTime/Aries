import type { ModuleRecord } from '@/types/module-page'

interface Props {
  items: ModuleRecord[]
  weightKey?: string
  amountKey?: string
  countKey?: string
  className?: string
}

export function EditorItemsSummary({
  items,
  weightKey = 'weightTon',
  amountKey = 'amount',
  countKey = 'quantity',
  className,
}: Props) {
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
      <span>行数 {items.length}</span>
      {totalCount > 0 && <span>数量 {totalCount}</span>}
      {totalWeight > 0 && <span>重量 {totalWeight.toFixed(3)} 吨</span>}
      {totalAmount > 0 && <span>金额 {totalAmount.toFixed(2)} 元</span>}
    </div>
  )
}
