/**
 * 报价表的列宽偏好：按「供应商 + 类别 + 材质」记忆，写到 localStorage。
 *
 * <p>列宽是**视图偏好**，不是业务数据：不落库、不进保存载荷，换供应商各自恢复。
 * 价格列默认只放得下 4 位数字（64px），但供应商报价位数差异很大（有的报到 5 位），
 * 所以允许拖动 / 键盘调整，并记住调整结果。</p>
 *
 * <p>为什么按「供应商 + 类别 + 材质」分开存：同一个品牌在直条与盘螺下宽度需求不同
 * （盘螺单定尺列 96px、直条双定尺列 64px），共用一个宽度会让另一张表被拉歪。</p>
 */

export const MIN_COLUMN_WIDTH = 48
export const MAX_COLUMN_WIDTH = 320
/** 键盘调整一档的宽度（WCAG 2.5.7：拖动必须有非拖动替代）。 */
export const COLUMN_WIDTH_STEP = 8

/** `sheetKey → columnKey → 宽度(px)`。 */
export type ColumnWidthPrefs = Record<string, Record<string, number>>

export const columnWidthsKey = (supplierId: string) =>
  `aries:supplier-quote-widths:${supplierId}`

/** 表身份：类别 + 材质（同一页每个材质一张表，宽度互不影响）。 */
export const sheetKeyOf = (category: string, material: string) =>
  `${category}\u0000${material}`

/** 列身份：品牌 + 定尺（同一品牌的不同定尺各自可调）。 */
export const columnKeyOf = (brandName: string, length: string) =>
  `${brandName}\u0000${length}`

/** 夹到 [48, 320]；非有限数（本地存储被改坏）退化为最小宽度，绝不让表格塌掉。 */
export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return MIN_COLUMN_WIDTH
  return Math.min(
    MAX_COLUMN_WIDTH,
    Math.max(MIN_COLUMN_WIDTH, Math.round(width)),
  )
}

/** 本地存储没有/坏了都返回空偏好：列宽是辅助，不能因为它让页面打不开。 */
export function readColumnWidths(supplierId: string): ColumnWidthPrefs {
  if (!supplierId || typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(columnWidthsKey(supplierId))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const prefs: ColumnWidthPrefs = {}
    for (const [sheetKey, columns] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (
        !sheetKey ||
        !columns ||
        typeof columns !== 'object' ||
        Array.isArray(columns)
      ) {
        continue
      }
      const widths: Record<string, number> = {}
      for (const [columnKey, width] of Object.entries(
        columns as Record<string, unknown>,
      )) {
        if (
          !columnKey ||
          typeof width !== 'number' ||
          !Number.isFinite(width)
        ) {
          continue
        }
        widths[columnKey] = clampColumnWidth(width)
      }
      if (Object.keys(widths).length) prefs[sheetKey] = widths
    }
    return prefs
  } catch {
    return {}
  }
}

/** 写失败（隐私模式 / 配额）静默忽略：本次调整在内存里仍然生效。 */
export function writeColumnWidths(
  supplierId: string,
  prefs: ColumnWidthPrefs,
): void {
  if (!supplierId || typeof window === 'undefined') return
  try {
    if (!Object.keys(prefs).length) {
      window.localStorage.removeItem(columnWidthsKey(supplierId))
      return
    }
    window.localStorage.setItem(
      columnWidthsKey(supplierId),
      JSON.stringify(prefs),
    )
  } catch {
    // 存不下不影响本次录入
  }
}

/** 取某列的宽度：命中用保存值，未命中用默认值（默认值同样要夹一遍）。 */
export function widthOf(
  prefs: ColumnWidthPrefs,
  sheetKey: string,
  columnKey: string,
  fallback: number,
): number {
  const saved = prefs[sheetKey]?.[columnKey]
  return clampColumnWidth(typeof saved === 'number' ? saved : fallback)
}

/** 设置一列宽度（不可变）：返回新偏好，原对象不动。 */
export function setColumnWidth(
  prefs: ColumnWidthPrefs,
  sheetKey: string,
  columnKey: string,
  width: number,
): ColumnWidthPrefs {
  if (!sheetKey || !columnKey) return prefs
  return {
    ...prefs,
    [sheetKey]: {
      ...(prefs[sheetKey] ?? {}),
      [columnKey]: clampColumnWidth(width),
    },
  }
}

/** 恢复某列默认宽度（不可变）；该表没有别的自定义列时把表键也删掉。 */
export function resetColumnWidth(
  prefs: ColumnWidthPrefs,
  sheetKey: string,
  columnKey: string,
): ColumnWidthPrefs {
  const current = prefs[sheetKey]
  if (!current || !(columnKey in current)) return prefs
  const nextSheet = { ...current }
  delete nextSheet[columnKey]
  const next = { ...prefs }
  if (Object.keys(nextSheet).length) next[sheetKey] = nextSheet
  else delete next[sheetKey]
  return next
}

/** 键盘 / 拖动共用的"加一档"：结果同样夹在合法区间内。 */
export function stepColumnWidth(width: number, step: number): number {
  return clampColumnWidth(width + step)
}
