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
  totalQuantity: number
  totalWeightTon: number
  totalFreight: number
  projectGroups: FreightStatementProjectGroup<Item>[]
}

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

function readFirstPositiveNumber<Item extends Record<string, unknown>>(
  items: Item[],
  key: string,
) {
  for (const item of items) {
    const number = Number(item[key])
    if (Number.isFinite(number) && number > 0) {
      return number
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

    return {
      key,
      sourceNo: readDistinctText(groupItems, 'sourceNo'),
      totalQuantity: projectGroupList.reduce(
        (sum, group) => sum + group.totalQuantity,
        0,
      ),
      totalWeightTon: projectGroupList.reduce(
        (sum, group) => sum + group.totalWeightTon,
        0,
      ),
      totalFreight: readFirstPositiveNumber(groupItems, '_parentTotalFreight'),
      projectGroups: projectGroupList,
    }
  })
}
