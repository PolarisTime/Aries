import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import { matchesToData, mergePriceData, normalizePeriod } from './core'
import type { BrandOption, PriceData, ProjectOption, Variety } from './types'

const BASE = `${import.meta.env.BASE_URL}price-compare/`

async function loadJson<T>(file: string): Promise<T> {
  const response = await fetch(`${BASE}${file}`)
  if (!response.ok)
    throw new Error(`加载 ${file} 失败: HTTP ${response.status}`)
  return (await response.json()) as T
}

type DataSource = {
  data: PriceData
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
}

/** 归一化时段键为 上午/中午/下午。 */
function normalizePeriods(data: PriceData): PriceData {
  const next: PriceData = {}
  for (const [date, periods] of Object.entries(data)) {
    next[date] = {}
    for (const [period, brands] of Object.entries(periods)) {
      next[date][normalizePeriod(period)] = brands
    }
  }
  return next
}

async function fetchDataSource(): Promise<DataSource> {
  const [rawData, varieties, projects, catalog] = await Promise.all([
    loadJson<PriceData>('data.json'),
    loadJson<Variety[]>('varieties.json'),
    loadJson<ProjectOption[]>('projects.json'),
    loadJson<BrandOption[]>('brands.json'),
  ])
  return {
    data: normalizePeriods(rawData),
    varieties: varieties.map((item) => ({
      ...item,
      label: item.label.replace(/Φ\s*/g, '').replace(/\s+/g, ' ').trim(),
    })),
    projects,
    catalog,
  }
}

export type PriceCompareData = {
  data: PriceData | null
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
  loading: boolean
  error: string | null
  /** 将后端商品行情匹配结果合并进当前数据 */
  mergeMatches: (matches: MaterialPriceMatch[]) => void
}

/** 加载比价数据源(静态 JSON; 后续可替换为后端 API)。 */
export function usePriceCompareData(): PriceCompareData {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['price-compare', 'data-source'],
    queryFn: fetchDataSource,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const mergeMatches = (matches: MaterialPriceMatch[]) => {
    const patch = matchesToData(matches)
    queryClient.setQueryData<DataSource>(
      ['price-compare', 'data-source'],
      (current) => {
        if (!current) return current
        return { ...current, data: mergePriceData(current.data, patch) }
      },
    )
  }

  return {
    data: query.data?.data ?? null,
    varieties: query.data?.varieties ?? [],
    projects: query.data?.projects ?? [],
    catalog: query.data?.catalog ?? [],
    loading: query.isLoading,
    error: query.isError
      ? '行情数据源加载失败，请检查 public/price-compare/ 下的 JSON 文件'
      : null,
    mergeMatches,
  }
}
