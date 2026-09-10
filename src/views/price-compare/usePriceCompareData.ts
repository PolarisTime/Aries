import { useQuery } from '@tanstack/react-query'
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

async function fetchDataSource(): Promise<DataSource> {
  const [data, varieties, projects, catalog] = await Promise.all([
    loadJson<PriceData>('data.json'),
    loadJson<Variety[]>('varieties.json'),
    loadJson<ProjectOption[]>('projects.json'),
    loadJson<BrandOption[]>('brands.json'),
  ])
  return { data, varieties, projects, catalog }
}

export type PriceCompareData = {
  data: PriceData | null
  varieties: Variety[]
  projects: ProjectOption[]
  catalog: BrandOption[]
  loading: boolean
  error: string | null
}

/** 加载比价数据源(静态 JSON; 后续可替换为后端 API)。 */
export function usePriceCompareData(): PriceCompareData {
  const query = useQuery({
    queryKey: ['price-compare', 'data-source'],
    queryFn: fetchDataSource,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return {
    data: query.data?.data ?? null,
    varieties: query.data?.varieties ?? [],
    projects: query.data?.projects ?? [],
    catalog: query.data?.catalog ?? [],
    loading: query.isLoading,
    error: query.isError
      ? '行情数据源加载失败，请检查 public/price-compare/ 下的 JSON 文件'
      : null,
  }
}
