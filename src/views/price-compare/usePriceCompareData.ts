import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import {
  fetchEffectiveProjectBrands,
  type QuoteProjectEffectiveBrands,
} from '@/api/market/quote-project-configs'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import {
  fetchSpecRows,
  type SupplierPriceSpecRow,
} from '@/api/market/supplier-price-lists'
import {
  fetchProjectPickerOptions,
  fetchProjectQuoteConfig,
} from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { useAuthStore } from '@/stores/authStore'
import {
  canonicalCategory,
  lengthRank,
  matchesToData,
  mergePriceData,
} from './core'
import brands from './data/brands.json'
import varieties from './data/varieties.json'
import { categoryRankOf, materialRankOf } from './supplier-quote-grid'
import type { BrandOption, PriceData, ProjectOption, Variety } from './types'

/**
 * 随包静态兜底数据：仅在未登录、首屏加载中或主数据查询失败时兜底展示；
 * 正常登录后商品规格（{@link Variety}）由 {@link fetchSpecRows} 实时从后端商品主数据派生，
 * 新增规格（如 Φ36/Φ40）维护后立即生效，无需发版改 JSON。
 */
const metadata: {
  varieties: Variety[]
  catalog: BrandOption[]
} = {
  varieties: varieties.map((item) => ({
    ...item,
    label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
  })),
  catalog: brands,
}

/**
 * 商品主数据行 → 报单比价规格选项（唯一转换口径）。
 *
 * <p>类别经 {@link canonicalCategory} 归一（直条 → 螺纹钢），与项目资料 `quote_products`、
 * 网价匹配和现货价派生键保持一致；空定尺归一为 `'-'`；去重后按品类 → 材质 → 规格 → 定尺排序。</p>
 */
export function specRowsToVarieties(
  rows: readonly SupplierPriceSpecRow[],
): Variety[] {
  const unique = new Map<string, Variety>()
  for (const row of rows) {
    const category = canonicalCategory((row.category ?? '').trim())
    const material = (row.material ?? '').trim()
    const length = (row.length ?? '').trim() || '-'
    if (
      !category ||
      !material ||
      !Number.isInteger(row.spec) ||
      row.spec <= 0
    ) {
      continue
    }
    const key = `${category}|${material}|${row.spec}|${length}`
    if (unique.has(key)) continue
    const lengthText =
      length === '-' ? (category === '盘螺' ? '盘' : '') : length
    const label = [category, material, String(row.spec), lengthText]
      .filter(Boolean)
      .join(' ')
    unique.set(key, {
      category,
      material,
      spec: row.spec,
      length,
      label,
    })
  }
  return [...unique.values()].sort(
    (left, right) =>
      categoryRankOf(left.category) - categoryRankOf(right.category) ||
      left.category.localeCompare(right.category, 'zh-Hans-CN') ||
      materialRankOf(left.material) - materialRankOf(right.material) ||
      left.material.localeCompare(right.material, 'zh-Hans-CN') ||
      left.spec - right.spec ||
      lengthRank(left.length) - lengthRank(right.length),
  )
}

export type PriceCompareData = {
  data: PriceData
  varieties: Variety[]
  /** 当前启用项目（来自后端，随项目资料变更实时生效）。 */
  projects: ProjectOption[]
  /** 项目清单是否仍在加载（此时 `projects` 为空，调用方不要据此判定"没有项目"）。 */
  projectsLoading: boolean
  catalog: BrandOption[]
  /** 合并后端商品行情匹配结果(网价完全来自后端) */
  mergeMatches: (matches: MaterialPriceMatch[]) => void
}

/** 比价页数据: 网价、项目清单与商品规格来自后端主数据（加载中/离线回退随包静态清单）。 */
export function usePriceCompareData(): PriceCompareData {
  const [data, setData] = useState<PriceData>({})
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const mergeMatches = useCallback((matches: MaterialPriceMatch[]) => {
    const patch = matchesToData(matches)
    setData((current) => mergePriceData(current, patch))
  }, [])

  /*
   * 项目清单走后端而不是随包 JSON：项目资料里新建的项目要能立刻在本页选中。
   * 查询键与网价一致地按模块分区；`staleTime` 取静态档即可 —— 项目清单变动不频繁，
   * 切回本页时不必每次重拉（react-query 默认在窗口聚焦时刷新）。
   */
  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.priceCompare.projects,
    queryFn: ({ signal }) => fetchProjectPickerOptions(signal),
    staleTime: STALE_STATIC,
  })
  const projects = useMemo<ProjectOption[]>(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  )

  const varietiesQuery = useQuery({
    queryKey: QUERY_KEYS.priceCompare.varieties,
    queryFn: ({ signal }) => fetchSpecRows(signal),
    enabled: isAuthenticated,
    staleTime: STALE_STATIC,
  })
  const resolvedVarieties = useMemo<Variety[]>(() => {
    const dynamic = varietiesQuery.data
      ? specRowsToVarieties(varietiesQuery.data)
      : []
    return dynamic.length > 0 ? dynamic : metadata.varieties
  }, [varietiesQuery.data])

  return {
    data,
    varieties: resolvedVarieties,
    projects,
    projectsLoading: projectsQuery.isPending,
    catalog: metadata.catalog,
    mergeMatches,
  }
}

/**
 * 当前单据所属项目的取价数据源/地区(按项目 id 查询)。
 * 比价页项目清单为随包静态数据, 故数据源/地区需按 id 单独查询。
 */
export function useActiveProjectQuoteConfig(
  projectId: string | undefined,
  enabled: boolean,
): { quoteSource?: 'MYSTEEL' | 'STEELX'; quoteRegion?: string } {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.priceCompare.projectQuoteConfig(projectId ?? ''),
    queryFn: ({ signal }) => fetchProjectQuoteConfig(projectId ?? '', signal),
    enabled: enabled && Boolean(projectId),
    staleTime: STALE_STATIC,
  })
  return data ?? {}
}

/**
 * 该项目用于报单比价的**有效品牌集合**（唯一取源）。
 *
 * <p>品牌事实已收归项目资料；资料为空/NULL（不限制）时后端只读回退到比价配置，并用
 * {@code fallback=true} 标记。调用方**必须同时消费 fallback**：只取 brands 会把「回退」
 * 当成「项目资料就是这么配的」，等于悄悄留下第二套口径。</p>
 */
export function useEffectiveProjectBrands(
  projectId: string | undefined,
  enabled: boolean,
): QuoteProjectEffectiveBrands {
  const { data } = useQuery({
    queryKey: QUERY_KEYS.priceCompare.projectEffectiveBrands(projectId ?? ''),
    queryFn: ({ signal }) =>
      fetchEffectiveProjectBrands(projectId ?? '', signal),
    enabled: enabled && Boolean(projectId),
    staleTime: STALE_STATIC,
  })
  return data ?? { brands: [], fallback: false }
}
