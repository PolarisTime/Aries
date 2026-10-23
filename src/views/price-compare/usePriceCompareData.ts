import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import {
  fetchEffectiveProjectBrands,
  type QuoteProjectEffectiveBrands,
} from '@/api/market/quote-project-configs'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import {
  fetchProjectPickerOptions,
  fetchProjectQuoteConfig,
} from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { matchesToData, mergePriceData } from './core'
import brands from './data/brands.json'
import varieties from './data/varieties.json'
import type { BrandOption, PriceData, ProjectOption, Variety } from './types'

/**
 * **参考类**元数据（品种、品牌）随应用发布会变更，体积很小，按工程惯例打进 bundle：
 * 构建期类型校验、内容哈希随版本缓存、无需运行时 fetch 与加载失败分支。
 *
 * <p><b>项目清单不在这里</b>：项目是用户在「基础数据 → 项目资料」里随时新建的**业务主数据**，
 * 打进 bundle 会让新建项目在比价页永远看不到（必须改 JSON 重新发版），并且同一实体
 * 在数据库与前端各存一份、已经漂移出错。它现在由 {@link fetchProjectPickerOptions} 从后端读取。</p>
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

/** 比价页数据: 网价与项目清单来自后端, 品种/品牌参考数据随包发布。 */
export function usePriceCompareData(): PriceCompareData {
  const [data, setData] = useState<PriceData>({})

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

  return {
    data,
    varieties: metadata.varieties,
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
