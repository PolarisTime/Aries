export interface CustomerStatementItemGroup<
  Item extends Record<string, unknown>,
> {
  key: string
  groupNo: number
  sourceNo: string
  deliveryDate: string
  items: Item[]
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readSourceItemId(value: unknown) {
  return readText(value)
}

function readDeliveryDate<Item extends Record<string, unknown>>(item: Item) {
  return (
    readText(item.deliveryDate) ||
    readText(item._parentBillTime) ||
    readText(item.billTime)
  )
}

export function groupCustomerStatementItems<
  Item extends Record<string, unknown>,
>(items: Item[]): CustomerStatementItemGroup<Item>[] {
  const groups = new Map<
    string,
    { sourceNo: string; deliveryDate: string; items: Item[] }
  >()

  for (const item of items) {
    const sourceNo = readText(item.sourceNo)
    const sourceItemId = readSourceItemId(item.sourceSalesOrderItemId)
    const key = sourceNo
      ? `source-no:${sourceNo}`
      : sourceItemId
        ? `source-item-id:${sourceItemId}`
        : 'unassigned'
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
      if (!group.deliveryDate) {
        group.deliveryDate = readDeliveryDate(item)
      }
      if (!group.sourceNo) {
        group.sourceNo = sourceNo
      }
      continue
    }
    groups.set(key, {
      sourceNo,
      deliveryDate: readDeliveryDate(item),
      items: [item],
    })
  }

  return Array.from(groups.entries()).map(([key, group], index) => ({
    key,
    groupNo: index + 1,
    sourceNo: group.sourceNo,
    deliveryDate: group.deliveryDate,
    items: group.items,
  }))
}
