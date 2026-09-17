/**
 * 打印明细「逐行勾选拆分」的前端预览计算：与后端 PrintItemSplitter 保持同一算法，
 * 每份 N 件、余数并入最后一份，重量/金额按累计数量比例缩放并采用累计舍入保证合计守恒。
 * 仅用于弹窗明细表预览；真正拆分仍由后端按 splitPieceCount + splitItemIds 执行。
 */

import type { PrintRecordItem } from '@/api/system/print-template'

export const PRINT_ITEM_WEIGHT_SCALE = 8
export const PRINT_ITEM_AMOUNT_SCALE = 2

export interface PrintItemSplitPart {
  index: number
  total: number
  quantity: number
  weightTon?: string
  amount?: string
}

/** 解析打印明细件数：仅接受正整数，缺失或非法返回 null。 */
export function parsePrintItemQuantity(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }
  if (typeof value !== 'string') {
    return null
  }
  const text = value.trim()
  if (!/^\d+$/.test(text)) {
    return null
  }
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * 计算一条明细拆分后的份列表。
 * 件数缺失/非正/≤ 每份件数或拆分后只有一份时返回 null（表示不拆）。
 */
export function splitPrintItemParts(
  quantity: unknown,
  pieceCount: unknown,
  totalWeight?: unknown,
  totalAmount?: unknown,
): PrintItemSplitPart[] | null {
  const totalQuantity = parsePrintItemQuantity(quantity)
  if (totalQuantity === null) {
    return null
  }
  if (
    typeof pieceCount !== 'number' ||
    !Number.isSafeInteger(pieceCount) ||
    pieceCount < 1 ||
    totalQuantity <= pieceCount
  ) {
    return null
  }

  const quantities: number[] = []
  let remaining = totalQuantity
  while (remaining >= pieceCount) {
    quantities.push(pieceCount)
    remaining -= pieceCount
  }
  if (quantities.length <= 1) {
    return null
  }
  quantities[quantities.length - 1] += remaining

  const weightTotal = parseFixed(totalWeight, PRINT_ITEM_WEIGHT_SCALE)
  const amountTotal = parseFixed(totalAmount, PRINT_ITEM_AMOUNT_SCALE)
  const totalQuantityBigInt = BigInt(totalQuantity)

  const parts: PrintItemSplitPart[] = []
  let cumulativeQuantity = 0n
  let previousWeight = 0n
  let previousAmount = 0n
  for (let index = 0; index < quantities.length; index += 1) {
    cumulativeQuantity += BigInt(quantities[index])
    const cumulativeWeight =
      weightTotal === null
        ? 0n
        : divideRoundHalfUp(
            weightTotal * cumulativeQuantity,
            totalQuantityBigInt,
          )
    const cumulativeAmount =
      amountTotal === null
        ? 0n
        : divideRoundHalfUp(
            amountTotal * cumulativeQuantity,
            totalQuantityBigInt,
          )
    parts.push({
      index: index + 1,
      total: quantities.length,
      quantity: quantities[index],
      ...(weightTotal === null
        ? {}
        : {
            weightTon: formatFixed(
              cumulativeWeight - previousWeight,
              PRINT_ITEM_WEIGHT_SCALE,
            ),
          }),
      ...(amountTotal === null
        ? {}
        : {
            amount: formatFixed(
              cumulativeAmount - previousAmount,
              PRINT_ITEM_AMOUNT_SCALE,
            ),
          }),
    })
    previousWeight = cumulativeWeight
    previousAmount = cumulativeAmount
  }
  return parts
}

/**
 * 构建「明细 ID → 拆分份预览」映射，供弹窗明细表展开行使用：
 * - 未传合并分组时按行独立拆分，仅勾选行有条目；
 * - 传入合并分组时按组汇总件数/重量/金额，拆分份挂在组内代表行（首行），
 *   与后端先合并再拆分的输出行保持一致。
 * 条目值为 {@code null} 表示该行/组件数未超过每份件数，无需拆分。
 */
export function buildPrintItemSplitPreviews(
  items: PrintRecordItem[],
  splitItemIds: readonly string[],
  pieceCount: number,
  mergeGroups: readonly (readonly string[])[] = [],
): Record<string, PrintItemSplitPart[] | null> {
  const splitItemIdSet = new Set(splitItemIds)
  const previewsByItemId: Record<string, PrintItemSplitPart[] | null> = {}
  const groupedItemIds = new Set<string>()
  if (mergeGroups.length) {
    const itemById = new Map(items.map((item) => [item.id, item]))
    for (const memberIds of mergeGroups) {
      for (const itemId of memberIds) groupedItemIds.add(itemId)
      if (!memberIds.some((itemId) => splitItemIdSet.has(itemId))) continue
      const members = memberIds
        .map((itemId) => itemById.get(itemId))
        .filter((item): item is PrintRecordItem => item !== undefined)
      if (!members.length) continue
      previewsByItemId[memberIds[0]] = splitPrintItemParts(
        sumPrintItemQuantities(members.map((item) => item.quantity)),
        pieceCount,
        sumPrintItemDecimals(
          members.map((item) => item.weightTon),
          PRINT_ITEM_WEIGHT_SCALE,
        ),
        sumPrintItemDecimals(
          members.map((item) => item.amount),
          PRINT_ITEM_AMOUNT_SCALE,
        ),
      )
    }
  }
  for (const item of items) {
    if (groupedItemIds.has(item.id) || !splitItemIdSet.has(item.id)) continue
    previewsByItemId[item.id] = splitPrintItemParts(
      item.quantity,
      pieceCount,
      item.weightTon,
      item.amount,
    )
  }
  return previewsByItemId
}

/** 汇总多行件数；全部缺失或非法时返回 null。 */
export function sumPrintItemQuantities(values: unknown[]): number | null {
  let total = 0
  let seen = false
  for (const value of values) {
    const parsed = parsePrintItemQuantity(value)
    if (parsed === null) continue
    total += parsed
    seen = true
  }
  return seen ? total : null
}

/** 汇总多行重量/金额等定点数；全部缺失或非法时返回 undefined。 */
export function sumPrintItemDecimals(
  values: unknown[],
  scale: number,
): string | undefined {
  let total: bigint | null = null
  for (const value of values) {
    const parsed = parseFixed(value, scale)
    if (parsed === null) continue
    total = (total ?? 0n) + parsed
  }
  return total === null ? undefined : formatFixed(total, scale)
}

/** 解析十进制字符串为定点整数；缺失或非数字返回 null，超出精度按 HALF_UP 舍入。 */
function parseFixed(value: unknown, scale: number): bigint | null {
  if (value === null || value === undefined) {
    return null
  }
  const text = String(value).trim()
  if (!text || text === '-') {
    return null
  }
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text)
  if (!match || (!match[1] && !match[2])) {
    return null
  }
  const whole = match[1] || '0'
  const fraction = (match[2] ?? '').padEnd(scale + 1, '0')
  const keptFraction = fraction.slice(0, scale)
  const roundingDigit = Number(fraction[scale] ?? '0')
  let scaled =
    BigInt(whole) * 10n ** BigInt(scale) + BigInt(keptFraction || '0')
  if (roundingDigit >= 5) {
    scaled += 1n
  }
  return scaled
}

/** 定点整数四舍五入（HALF_UP）除，输入均为非负数。 */
function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator
  const remainder = numerator % denominator
  return remainder * 2n >= denominator ? quotient + 1n : quotient
}

/** 定点整数格式化为固定小数位字符串。 */
function formatFixed(value: bigint, scale: number): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const whole = digits.slice(0, digits.length - scale)
  const fraction = digits.slice(digits.length - scale)
  const text = scale > 0 ? `${whole}.${fraction}` : whole
  return negative ? `-${text}` : text
}
