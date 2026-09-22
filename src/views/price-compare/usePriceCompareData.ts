import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import { fetchProjectQuoteConfig } from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { matchesToData, mergePriceData } from './core'
import brands from './data/brands.json'
import projects from './data/projects.json'
import varieties from './data/varieties.json'
import type { BrandOption, PriceData, ProjectOption, Variety } from './types'

/**
 * 基础元数据随应用发布会变更，体积很小，按工程惯例打进 bundle：
 * 构建期类型校验、内容哈希随版本缓存、无需运行时 fetch 与加载失败分支。
 * 网价等大体积/需独立更新的数据仍由后端接口提供（mergeMatches）。
 */
const metadata: {
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
} = {
  varieties: varieties.map((item) => ({
    ...item,
    label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
  })),
  projects,
  catalog: brands,
}

export type PriceCompareData = {
  data: PriceData
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
  /** 合并后端商品行情匹配结果(网价完全来自后端) */
  mergeMatches: (matches: MaterialPriceMatch[]) => void
}

/** 比价页数据: 网价来自后端匹配接口, 商品/项目/品牌元数据来自随包发布的本地清单。 */
export function usePriceCompareData(): PriceCompareData {
  const [data, setData] = useState<PriceData>({})

  const mergeMatches = useCallback((matches: MaterialPriceMatch[]) => {
    const patch = matchesToData(matches)
    setData((current) => mergePriceData(current, patch))
  }, [])

  return {
    data,
    varieties: metadata.varieties,
    projects: metadata.projects,
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
