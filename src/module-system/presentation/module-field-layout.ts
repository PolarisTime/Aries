interface RowField {
  row?: number
  fullRow?: boolean
  type?: string
}

function normalizeRow(value: unknown) {
  const row = Number(value)
  if (!Number.isFinite(row) || row < 1) {
    return 1
  }
  return Math.trunc(row)
}

export function groupFieldsByRow<T extends RowField>(fields: T[]): T[][] {
  if (!fields.length) {
    return []
  }

  const hasExplicitRows = fields.some((field) => field.row !== undefined)
  if (!hasExplicitRows) {
    const rows: T[][] = []
    let currentRow: T[] = []

    const flushCurrentRow = () => {
      if (currentRow.length) {
        rows.push(currentRow)
        currentRow = []
      }
    }

    fields.forEach((field) => {
      if (field.fullRow || field.type === 'textarea') {
        flushCurrentRow()
        rows.push([field])
        return
      }

      currentRow.push(field)
      if (currentRow.length === 4) {
        flushCurrentRow()
      }
    })

    flushCurrentRow()
    return rows
  }

  const grouped = new Map<number, T[]>()

  fields.forEach((field) => {
    const row = normalizeRow(field.row)
    const items = grouped.get(row)
    if (items) {
      items.push(field)
      return
    }
    grouped.set(row, [field])
  })

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([, items]) => items)
}

/**
 * 抬头字段排序：把「单号类字段」移到**同一个 section 段内**的末尾，
 * 客户/供应商（公司）、项目等业务对象因此自然前移。
 *
 * <p>为什么只在段内移动：`ModuleEditorFormSection` 按「相邻 section 相同」分段，
 * 若把单号从段首搬到整表末尾，它们会与原来的 section 断成两段，渲染出重复的区块标题。
 * 段内稳定分区只调整顺序，不改变分段；`groupFieldsByRow` 仍按 `row` 归组，
 * 所以单号落在它原来那一行的末尾，不会跳到整张表单最后。</p>
 *
 * <p>单号由调用方给出（主单号 `primaryNoKey` + 来源单号 `parentImport.parentFieldKey`），
 * 不按 key 后缀猜：`batchNo`（批号）同样以 `No` 结尾，但它不是单据号。</p>
 */
export function moveDocumentNoFieldsToSectionEnd<
  T extends { key: string; section?: string },
>(fields: T[], documentNoKeys: readonly string[]): T[] {
  const documentNoKeySet = new Set(documentNoKeys)
  if (!documentNoKeySet.size) {
    return fields
  }
  const ordered: T[] = []
  let segmentStart = 0
  while (segmentStart < fields.length) {
    const section = fields[segmentStart].section
    let segmentEnd = segmentStart
    while (
      segmentEnd < fields.length &&
      fields[segmentEnd].section === section
    ) {
      segmentEnd += 1
    }
    const segment = fields.slice(segmentStart, segmentEnd)
    ordered.push(
      ...segment.filter((field) => !documentNoKeySet.has(field.key)),
      ...segment.filter((field) => documentNoKeySet.has(field.key)),
    )
    segmentStart = segmentEnd
  }
  return ordered
}
