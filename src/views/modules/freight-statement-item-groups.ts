export interface FreightStatementProjectGroup<
  Item extends Record<string, unknown>,
> {
  key: string
  customerName: string
  projectName: string
  totalQuantity: number
  totalWeightTon: number
  items: Item[]
}

export interface FreightStatementItemGroup<
  Item extends Record<string, unknown>,
> {
  key: string
  sourceNo: string
  billTime: string
  totalQuantity: number
  totalWeightTon: number
  totalFreight: number
  unitPrice: number
  projectGroups: FreightStatementProjectGroup<Item>[]
}

export type FreightStatementSortMode = 'sourceNo' | 'billTime'
export type FreightStatementSortDirection = 'asc' | 'desc'

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readSourceId(value: unknown) {
  if (typeof value === 'string') {
    return value.trim()
  }
  return typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : ''
}

function compareSourceNo(left: string, right: string) {
  const leftIsNumeric = /^\d+$/.test(left)
  const rightIsNumeric = /^\d+$/.test(right)
  if (leftIsNumeric && rightIsNumeric) {
    const leftValue = BigInt(left)
    const rightValue = BigInt(right)
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
  }
  return left.localeCompare(right, 'zh-CN', { numeric: true })
}

function readSourceBillTime<Item extends Record<string, unknown>>(item: Item) {
  return (
    readText(item.sourceFreightBillTime) ||
    readText(item._parentBillTime) ||
    readText(item.billTime)
  )
}

/** 按物流单号或来源单据日期稳定排序，缺失排序值的明细始终排在最后。 */
export function sortFreightStatementItems<Item extends Record<string, unknown>>(
  items: Item[],
  mode: FreightStatementSortMode,
  direction: FreightStatementSortDirection = 'asc',
): Item[] {
  const directionMultiplier = direction === 'desc' ? -1 : 1
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftValue =
        mode === 'billTime'
          ? readSourceBillTime(left.item)
          : readText(left.item.sourceNo)
      const rightValue =
        mode === 'billTime'
          ? readSourceBillTime(right.item)
          : readText(right.item.sourceNo)
      if (!leftValue && !rightValue) return left.index - right.index
      if (!leftValue) return 1
      if (!rightValue) return -1
      const comparison =
        mode === 'billTime'
          ? leftValue.localeCompare(rightValue)
          : compareSourceNo(leftValue, rightValue)
      return comparison * directionMultiplier || left.index - right.index
    })
    .map(({ item }) => item)
}

function readFirstSourceBillTime<Item extends Record<string, unknown>>(
  items: Item[],
) {
  return items.map(readSourceBillTime).find(Boolean) || ''
}

function readNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function readDistinctText<Item extends Record<string, unknown>>(
  items: Item[],
  key: string,
) {
  return Array.from(
    new Set(
      items.flatMap((item) => {
        const value = readText(item[key])
        return value ? [value] : []
      }),
    ),
  ).join('、')
}

function summarizeProjectGroup<Item extends Record<string, unknown>>(
  projectKey: string,
  projectName: string,
  items: Item[],
): FreightStatementProjectGroup<Item> {
  return {
    key: projectKey,
    projectName,
    customerName: readDistinctText(items, 'customerName'),
    totalQuantity: items.reduce(
      (sum, item) => sum + readNumber(item.quantity),
      0,
    ),
    totalWeightTon: items.reduce(
      (sum, item) => sum + readNumber(item.weightTon),
      0,
    ),
    items,
  }
}

/**
 * 普通物流单按客户和项目拆分明细，避免不同项目混在同一张表中。
 * 项目名称缺失的行统一归入“未分组”，并保留首次出现顺序。
 */
export function groupFreightBillItems<Item extends Record<string, unknown>>(
  items: Item[],
): FreightStatementProjectGroup<Item>[] {
  const groups = new Map<
    string,
    { customerName: string; projectName: string; items: Item[] }
  >()

  for (const item of items) {
    const customerName = readText(item.customerName)
    const projectName = readText(item.projectName)
    const key = JSON.stringify(['project', customerName, projectName])
    const group = groups.get(key)
    if (group) {
      group.items.push(item)
    } else {
      groups.set(key, { customerName, projectName, items: [item] })
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => {
    const summarized = summarizeProjectGroup(
      key,
      group.projectName,
      group.items,
    )
    return {
      ...summarized,
      customerName: group.customerName || summarized.customerName,
    }
  })
}

function readFirstPositiveNumber<Item extends Record<string, unknown>>(
  items: Item[],
  ...keys: string[]
) {
  for (const item of items) {
    for (const key of keys) {
      const number = Number(item[key])
      if (Number.isFinite(number) && number > 0) {
        return number
      }
    }
  }
  return 0
}

export function groupFreightStatementItems<
  Item extends Record<string, unknown>,
>(items: Item[]): FreightStatementItemGroup<Item>[] {
  const sourceGroups = new Map<string, Item[]>()

  for (const item of items) {
    const sourceId = readSourceId(item.sourceFreightBillId)
    const sourceNo = readText(item.sourceNo)
    const key = sourceId
      ? `source-id:${sourceId}`
      : sourceNo
        ? `source-no:${sourceNo}`
        : 'unassigned'
    const group = sourceGroups.get(key)
    if (group) {
      group.push(item)
    } else {
      sourceGroups.set(key, [item])
    }
  }

  return Array.from(sourceGroups.entries()).map(([key, groupItems]) => {
    const projectGroups = new Map<string, Item[]>()
    for (const item of groupItems) {
      const projectName = readText(item.projectName)
      const projectKey = projectName ? `project:${projectName}` : 'unassigned'
      const projectItems = projectGroups.get(projectKey)
      if (projectItems) {
        projectItems.push(item)
      } else {
        projectGroups.set(projectKey, [item])
      }
    }

    const projectGroupList = Array.from(projectGroups.entries()).map(
      ([projectKey, projectItems]) => {
        const projectName = readDistinctText(projectItems, 'projectName')
        return summarizeProjectGroup(projectKey, projectName, projectItems)
      },
    )
    const totalWeightTon = projectGroupList.reduce(
      (sum, group) => sum + group.totalWeightTon,
      0,
    )
    const totalFreight = readFirstPositiveNumber(
      groupItems,
      'sourceFreightBillTotalFreight',
      '_parentTotalFreight',
    )
    const sourceUnitPrice = readFirstPositiveNumber(
      groupItems,
      'sourceFreightBillUnitPrice',
    )

    return {
      key,
      sourceNo: readDistinctText(groupItems, 'sourceNo'),
      billTime: readFirstSourceBillTime(groupItems),
      totalQuantity: projectGroupList.reduce(
        (sum, group) => sum + group.totalQuantity,
        0,
      ),
      totalWeightTon,
      totalFreight,
      unitPrice:
        sourceUnitPrice ||
        (totalWeightTon > 0 ? totalFreight / totalWeightTon : 0),
      projectGroups: projectGroupList,
    }
  })
}
