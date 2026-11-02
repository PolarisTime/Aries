import Decimal from 'decimal.js'

import {
  DISPLAY_AMOUNT_PRECISION,
  INTERNAL_WEIGHT_PRECISION,
} from '@/constants/precision'

/**
 * 金额与重量计算的**唯一十进制出口**。
 *
 * <p>背景：`Number(value).toFixed(2)` 按 IEEE-754 的二进制真实值舍入，
 * `9.995 * 3335` 的 double 值是 `33333.324999999997…`，会被舍成 `33333.32`，
 * 而后端 `BigDecimal` + `HALF_UP` 得 `33333.33` —— 同一张单据编辑时与保存后差 1 分。</p>
 *
 * <p>口径（必须与后端 `PrecisionConstants` 保持一致，规则变更以本文件与后端常量同步为准）：</p>
 * <ul>
 *   <li>金额：2 位小数，`HALF_UP`（四舍五入）；</li>
 *   <li>重量：8 位小数，`HALF_UP`；</li>
 *   <li>先按十进制精确相乘/相加，**只在最终结果上舍入一次**；</li>
 *   <li>输入统一经 `String(value)` 转成十进制字面量，避免数字类型再次携带二进制误差。</li>
 * </ul>
 *
 * <p>禁止在业务代码里直接写 `Number(a * b).toFixed(2)` / `Math.round(x * 100) / 100`
 * 之类的金额计算 —— 一律走本模块。</p>
 */

// clone 而不是改 Decimal 全局配置：避免影响同进程内其它可能使用 decimal.js 的代码。
const MoneyDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
})

/** 金额精度（元），与后端 AMOUNT_SCALE 对齐。 */
const AMOUNT_SCALE = DISPLAY_AMOUNT_PRECISION

/** 内部重量精度（吨），与后端 WEIGHT_SCALE 对齐。 */
const WEIGHT_SCALE = INTERNAL_WEIGHT_PRECISION

function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined || value === '') {
    return new MoneyDecimal(0)
  }
  try {
    const decimal = new MoneyDecimal(String(value))
    return decimal.isFinite() ? decimal : new MoneyDecimal(0)
  } catch {
    // 非数字字符串与历史 `Number(value)` → NaN → 0 的兜底行为保持一致。
    return new MoneyDecimal(0)
  }
}

/** 通用十进制舍入：按精度四舍五入（HALF_UP）。 */
export function roundDecimal(value: unknown, precision: number): number {
  return toDecimal(value)
    .toDecimalPlaces(precision, Decimal.ROUND_HALF_UP)
    .toNumber()
}

/** 金额舍入到分（2 位，HALF_UP）。 */
export function roundAmount(value: unknown): number {
  return roundDecimal(value, AMOUNT_SCALE)
}

/** 重量舍入到 8 位（HALF_UP）。 */
export function roundWeight(value: unknown): number {
  return roundDecimal(value, WEIGHT_SCALE)
}

/** 金额乘法：`吨位 × 单价`、`调整吨位 × 单价` 等，精确相乘后舍到分。 */
export function multiplyAmount(left: unknown, right: unknown): number {
  return toDecimal(left)
    .times(toDecimal(right))
    .toDecimalPlaces(AMOUNT_SCALE, Decimal.ROUND_HALF_UP)
    .toNumber()
}

/** 金额除法：`金额 ÷ 吨位` 反算单价等，除数为 0 时返回 0（与编辑器原有保护一致）。 */
export function divideAmount(dividend: unknown, divisor: unknown): number {
  const denominator = toDecimal(divisor)
  if (denominator.isZero()) {
    return 0
  }
  return toDecimal(dividend)
    .dividedBy(denominator)
    .toDecimalPlaces(AMOUNT_SCALE, Decimal.ROUND_HALF_UP)
    .toNumber()
}

/**
 * 金额求和：逐行金额相加后舍到分。
 *
 * <p>与后端「行级舍入后汇总」同口径；调用方传入已舍入的行金额时结果稳定，
 * 传入未舍入值（如费用小计）时也是「先精确相加、最后舍入一次」。</p>
 */
export function sumAmounts(values: readonly unknown[]): number {
  const total = values.reduce<Decimal>(
    (sum, value) => sum.plus(toDecimal(value)),
    new MoneyDecimal(0),
  )
  return total.toDecimalPlaces(AMOUNT_SCALE, Decimal.ROUND_HALF_UP).toNumber()
}

/** 金额减法：`总额 − 已付`、`实际 − 退货` 等，精确相减后舍到分。 */
export function subtractAmount(left: unknown, right: unknown): number {
  return toDecimal(left)
    .minus(toDecimal(right))
    .toDecimalPlaces(AMOUNT_SCALE, Decimal.ROUND_HALF_UP)
    .toNumber()
}

/**
 * 通用十进制求和：合计件数/重量等非金额字段（默认重量精度 8 位，HALF_UP）。
 *
 * <p>打印作业的「合计件数 / 合计重量」原先用 `reduce((sum, v) => sum + Number(v))`
 * 累加，多行明细下会出现 `0.1 + 0.2 = 0.30000000000000004` 这类二进制误差，
 * 合计与单据上的吨位对不上。</p>
 */
export function sumValues(
  values: readonly unknown[],
  precision: number = WEIGHT_SCALE,
): number {
  const total = values.reduce<Decimal>(
    (sum, value) => sum.plus(toDecimal(value)),
    new MoneyDecimal(0),
  )
  return total.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toNumber()
}

/**
 * 按精度格式化为十进制文本（不经过 `Number` 二次转换）。
 *
 * <p>展示层用它替代 `value.toFixed(n)`：后者按 IEEE-754 二进制真实值舍入，
 * `2.675.toFixed(2)` 得 `"2.67"`、`9.995.toFixed(2)` 得 `"9.99"`，
 * 与本模块 HALF_UP 口径不一致。</p>
 */
export function formatDecimal(value: unknown, precision: number): string {
  return toDecimal(value)
    .toDecimalPlaces(precision, Decimal.ROUND_HALF_UP)
    .toFixed(precision)
}
