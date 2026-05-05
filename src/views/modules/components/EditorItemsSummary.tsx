interface Props {
  items: Record<string, unknown>[]
  weightKey?: string
  amountKey?: string
  countKey?: string
}

export function EditorItemsSummary({ items, weightKey = 'weightTon', amountKey = 'amount', countKey = 'quantity' }: Props) {
  const totalWeight = items.reduce((sum, item) => sum + (Number(item[weightKey]) || 0), 0)
  const totalAmount = items.reduce((sum, item) => sum + (Number(item[amountKey]) || 0), 0)
  const totalCount = items.reduce((sum, item) => sum + (Number(item[countKey]) || 0), 0)

  return (
    <div className="flex items-center justify-end gap-6 py-2 px-3 bg-gray-50 border-t border-gray-100 text-sm">
      <span>共 <strong>{items.length}</strong> 行</span>
      {totalCount > 0 && <span>数量: <strong>{totalCount.toLocaleString()}</strong></span>}
      {totalWeight > 0 && <span>重量: <strong>{totalWeight.toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</strong> 吨</span>}
      {totalAmount > 0 && <span>金额: <strong>{totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>}
    </div>
  )
}
