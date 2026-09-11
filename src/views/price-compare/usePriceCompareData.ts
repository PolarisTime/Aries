import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { matchesToData, mergePriceData } from './core'
import type { BrandOption, PriceData, ProjectOption, Variety } from './types'

const BASE = `${import.meta.env.BASE_URL}price-compare/`

async function loadJson<T>(file: string): Promise<T> {
  const response = await fetch(`${BASE}${file}`)
  if (!response.ok)
    throw new Error(`加载 ${file} 失败: HTTP ${response.status}`)
  return (await response.json()) as T
}

type Metadata = {
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
}

async function fetchMetadata(): Promise<Metadata> {
  const [varieties, projects, catalog] = await Promise.all([
    loadJson<Variety[]>('varieties.json'),
    loadJson<ProjectOption[]>('projects.json'),
    loadJson<BrandOption[]>('brands.json'),
  ])
  return {
    varieties: varieties.map((item) => ({
      ...item,
      label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
    })),
    projects,
    catalog,
  }
}

export type PriceCompareData = {
  data: PriceData
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
  loading: boolean
  error: string | null
  /** 合并后端商品行情匹配结果(网价完全来自后端) */
  mergeMatches: (matches: MaterialPriceMatch[]) => void
}

/** 比价页数据: 网价来自后端匹配接口, 商品/项目/品牌元数据来自本地清单。 */
export function usePriceCompareData(): PriceCompareData {
  const [data, setData] = useState<PriceData>({})
  const query = useQuery({
    queryKey: QUERY_KEYS.priceCompare.metadata,
    queryFn: fetchMetadata,
    staleTime: STALE_STATIC,
  })

  const mergeMatches = useCallback((matches: MaterialPriceMatch[]) => {
    const patch = matchesToData(matches)
    setData((current) => mergePriceData(current, patch))
  }, [])

  return {
    data,
    varieties: query.data?.varieties ?? [],
    projects: query.data?.projects ?? [],
    catalog: query.data?.catalog ?? [],
    loading: query.isLoading,
    error: query.isError
      ? '基础数据加载失败，请检查 public/price-compare/ 下的 JSON 文件'
      : null,
    mergeMatches,
  }
}
