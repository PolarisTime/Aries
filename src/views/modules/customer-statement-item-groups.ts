import { parseDateTimeValue } from '@/utils/formatters'

export interface CustomerStatementItemGroup<
  Item extends Record<string, unknown>,
> {
  key: string
  groupNo: number
  sourceNo: string
  deliveryDate: string
  totalQuantity: number
  totalWeightTon: number
  totalAmount: number
  items: Item[]
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readSourceItemId(value: unknown) {
  return readText(value)
}

function readNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function readDeliveryDate<Item extends Record<string, unknown>>(item: Item) {
  return (
    readText(item.deliveryDate) ||
    readText(item._parentBillTime) ||
    readText(item.billTime)
  )
}

function compareDeliveryDates(left: unknown, right: unknown) {
  const leftDate = parseDateTimeValue(left)
  const rightDate = parseDateTimeValue(right)
  if (!leftDate && !rightDate) return 0
  if (!leftDate) return 1
  if (!rightDate) return -1
  return leftDate.valueOf() - rightDate.valueOf()
}

export function sortCustomerStatementItemsByDeliveryDate<
  Item extends Record<string, unknown>,
>(items: readonly Item[]): Item[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) =>
        compareDeliveryDates(
          readDeliveryDate(left.item),
          readDeliveryDate(right.item),
        ) || left.index - right.index,
    )
    .map(({ item }) => item)
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

  return Array.from(groups.entries())
    .map(([key, group], firstIndex) => ({
      key,
      sourceNo: group.sourceNo,
      deliveryDate: group.deliveryDate,
      totalQuantity: group.items.reduce(
        (sum, item) => sum + readNumber(item.quantity),
        0,
      ),
      totalWeightTon: group.items.reduce(
        (sum, item) => sum + readNumber(item.weightTon),
        0,
      ),
      totalAmount: group.items.reduce(
        (sum, item) => sum + readNumber(item.amount),
        0,
      ),
      items: group.items,
      firstIndex,
    }))
    .sort(
      (left, right) =>
        compareDeliveryDates(left.deliveryDate, right.deliveryDate) ||
        left.firstIndex - right.firstIndex,
    )
    .map((group, index) => ({
      key: group.key,
      groupNo: index + 1,
      sourceNo: group.sourceNo,
      deliveryDate: group.deliveryDate,
      totalQuantity: group.totalQuantity,
      totalWeightTon: group.totalWeightTon,
      totalAmount: group.totalAmount,
      items: group.items,
    }))
}
