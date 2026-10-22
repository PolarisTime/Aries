import { useCallback, useEffect, useState } from 'react'
import { isCanceledRequestError } from '@/api/core/request-errors'
import {
  fetchPricingQuoteResolution,
  type PricingQuoteResolution,
  type PricingQuoteResolutionParams,
} from '@/api/market/pricing-quote-resolutions'
import type {
  ProjectPriceClosedSettleDirection,
  ProjectPriceDateBasis,
  ProjectPricePeriod,
  ProjectPricePeriodPolicy,
} from '@/api/master/project-options'
import {
  normalizePriceClosedSettleDays,
  normalizePriceClosedSettleDirection,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
} from '@/api/master/project-options'
import { summarizeErrorMessage } from '@/utils/error-presentation'

/**
 * 单据级临时覆盖：只作用于本次交付核定，不改项目配置。
 * 与解析请求参数一一对应，未设置的字段沿用项目配置。
 */
export interface PricingQuoteControls {
  basis?: ProjectPriceDateBasis
  offsetDays?: number
  /** 休市取价方向（PREV 往前 / NEXT 延后）。 */
  priceClosedSettleDirection?: ProjectPriceClosedSettleDirection
  /** 休市调整天数（0..30）；0 表示不位移。 */
  priceClosedSettleDays?: number
  periodPolicy?: ProjectPricePeriodPolicy
  /** 固定/手工策略下的目标时段（中文枚举值）。 */
  period?: ProjectPricePeriod
  /** 手工基准（或界面指定）下的取价日期（ISO yyyy-MM-dd）。 */
  quoteDate?: string
}

/** 覆盖值的初始态：空对象表示完全沿用项目配置。 */
const EMPTY_CONTROLS: PricingQuoteControls = {}

interface ResolvedState {
  /** 该结果对应的请求键：与当前请求键一致才算「已解析」。 */
  key: string
  resolution: PricingQuoteResolution | null
  error: string | null
}

export interface PricingQuoteResolutionState {
  /** 解析结果；解析中或失败时为 null。 */
  resolution: PricingQuoteResolution | null
  resolving: boolean
  /** 解析失败原因（后端 ProblemDetail 的 detail 文案），未失败时为 null。 */
  error: string | null
  controls: PricingQuoteControls
  /** 合并覆盖值后重新解析（改任一项即触发）。 */
  updateControls: (patch: PricingQuoteControls) => void
  /** 清空全部覆盖，回到项目配置口径。 */
  resetControls: () => void
  /** 采纳建议日期：切到手工基准并以建议日期重新解析。 */
  adoptSuggestedDate: () => void
}

/** 请求键：把影响解析入参的原始值编成一维字符串，用于判定「解析结果是否已对应当前入参」。 */
function buildRequestKey(args: {
  orderDate: string
  deliveryDate: string
  basis?: ProjectPriceDateBasis
  offsetDays?: number
  priceClosedSettleDirection?: ProjectPriceClosedSettleDirection
  priceClosedSettleDays?: number
  periodPolicy?: ProjectPricePeriodPolicy
  period?: ProjectPricePeriod
  quoteDate?: string
}): string {
  return [
    args.orderDate,
    args.deliveryDate,
    args.basis ?? '',
    args.offsetDays === undefined ? '' : String(args.offsetDays),
    args.priceClosedSettleDirection ?? '',
    args.priceClosedSettleDays === undefined
      ? ''
      : String(args.priceClosedSettleDays),
    args.periodPolicy ?? '',
    args.period ?? '',
    args.quoteDate ?? '',
  ].join('|')
}

/**
 * 交付核定取价基准解析：弹窗打开（或项目/单据日期变化）时解析一次，
 * 人工改基准/偏移/时段策略/时段/手工日期后按覆盖值再解析。
 *
 * <p>「解析中」是派生的：解析结果带着请求键落地，键不一致即为解析中，
 * 因此 effect 内不需要同步 setState（React Compiler 会因此跳过记忆化）。
 * 竞态由 AbortSignal 兜底：覆盖值连续变化时旧请求被取消，只有最后一次落地。</p>
 */
export function usePricingQuoteResolution(args: {
  open: boolean
  projectId: string
  orderDate: string
  deliveryDate: string
}): PricingQuoteResolutionState {
  const { open, projectId, orderDate, deliveryDate } = args
  const [controls, setControls] = useState<PricingQuoteControls>(EMPTY_CONTROLS)
  const [resolved, setResolved] = useState<ResolvedState | null>(null)

  const {
    basis,
    offsetDays,
    priceClosedSettleDirection,
    priceClosedSettleDays,
    periodPolicy,
    period,
  } = controls
  const quoteDate = controls.quoteDate

  const requestKey = buildRequestKey({
    orderDate,
    deliveryDate,
    basis,
    offsetDays,
    priceClosedSettleDirection,
    priceClosedSettleDays,
    periodPolicy,
    period,
    quoteDate,
  })

  useEffect(() => {
    if (!open || !projectId) return undefined
    const controller = new AbortController()
    const params: PricingQuoteResolutionParams = {
      ...(orderDate ? { orderDate } : {}),
      ...(deliveryDate ? { deliveryDate } : {}),
      ...(basis ? { basis } : {}),
      ...(offsetDays === undefined ? {} : { offsetDays }),
      ...(priceClosedSettleDirection ? { priceClosedSettleDirection } : {}),
      ...(priceClosedSettleDays === undefined ? {} : { priceClosedSettleDays }),
      ...(periodPolicy ? { periodPolicy } : {}),
      ...(period ? { period } : {}),
      ...(quoteDate ? { quoteDate } : {}),
    }
    fetchPricingQuoteResolution(projectId, params, controller.signal)
      .then((result) => {
        setResolved({ key: requestKey, resolution: result, error: null })
      })
      .catch((cause: unknown) => {
        if (isCanceledRequestError(cause)) return
        setResolved({
          key: requestKey,
          resolution: null,
          error: summarizeErrorMessage(cause) || null,
        })
      })
    return () => {
      controller.abort()
    }
  }, [
    open,
    projectId,
    orderDate,
    deliveryDate,
    basis,
    offsetDays,
    priceClosedSettleDirection,
    priceClosedSettleDays,
    periodPolicy,
    period,
    quoteDate,
    requestKey,
  ])

  const updateControls = useCallback((patch: PricingQuoteControls) => {
    setControls((current) => ({ ...current, ...patch }))
  }, [])

  const resetControls = useCallback(() => {
    setControls(EMPTY_CONTROLS)
  }, [])

  const suggestedDate = resolved?.resolution?.suggestedDate ?? ''
  const adoptSuggestedDate = useCallback(() => {
    if (!suggestedDate) return
    // 建议日期来自「基准日无行情」的解析结果，采纳即按手工基准指定该日重新解析。
    setControls((current) => ({
      ...current,
      basis: 'MANUAL',
      quoteDate: suggestedDate,
    }))
  }, [suggestedDate])

  const inSync = open && Boolean(projectId) && resolved?.key === requestKey

  return {
    resolution: inSync ? (resolved?.resolution ?? null) : null,
    resolving: Boolean(open && projectId) && !inSync,
    error: inSync ? (resolved?.error ?? null) : null,
    controls,
    updateControls,
    resetControls,
    adoptSuggestedDate,
  }
}

/** 面板展示用的有效口径：解析结果优先（后端已回显本次生效值），否则用覆盖值。 */
export interface EffectivePricingQuoteControls {
  basis: ProjectPriceDateBasis
  offsetDays: number
  priceClosedSettleDirection: ProjectPriceClosedSettleDirection
  priceClosedSettleDays: number
  periodPolicy: ProjectPricePeriodPolicy
  period: ProjectPricePeriod | null
  quoteDate: string
}

export function resolveEffectiveControls(
  resolution: PricingQuoteResolution | null,
  controls: PricingQuoteControls,
): EffectivePricingQuoteControls {
  const rawDirection =
    resolution?.priceClosedSettleDirection ??
    controls.priceClosedSettleDirection
  const rawDays =
    resolution?.priceClosedSettleDays ?? controls.priceClosedSettleDays

  return {
    basis: normalizePriceDateBasis(resolution?.basis ?? controls.basis),
    offsetDays: normalizePriceDateOffsetDays(
      resolution?.offsetDays ?? controls.offsetDays,
    ),
    priceClosedSettleDirection:
      normalizePriceClosedSettleDirection(rawDirection),
    priceClosedSettleDays: normalizePriceClosedSettleDays(rawDays),
    periodPolicy: normalizePricePeriodPolicy(
      resolution?.periodPolicy ?? controls.periodPolicy,
    ),
    period: normalizePricePeriodFixed(
      controls.period ?? resolution?.requestedPeriod,
    ),
    quoteDate: controls.quoteDate ?? resolution?.targetDate ?? '',
  }
}
