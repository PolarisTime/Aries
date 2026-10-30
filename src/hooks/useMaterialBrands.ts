import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getToken } from '@/utils/storage'

const brandListSchema = z.array(z.string())

/** 稳定的空数组引用: 避免未加载时每次 render 返回新数组, 破坏调用方 useMemo。 */
const EMPTY_BRANDS: string[] = []

/**
 * 品牌清单的**唯一缓存键**。
 *
 * <p>比价页（{@link useMaterialBrands}）与通用编辑器的「经营品牌」多选
 * （`useMasterOptions` 的 `brands` 需求 → `getBrandOptions`）必须共用这一个 key，
 * 否则同一份品牌清单会被请求两次、并在两处各自过期。改动此键等于同时改动这两条链路。</p>
 */
export const MATERIAL_BRANDS_QUERY_KEY = QUERY_KEYS.priceCompare.materialBrands

/**
 * 品牌清单的**唯一请求出口**（`ENDPOINTS.MATERIAL_BRANDS` + 同一份 zod 校验）。
 *
 * <p>导出而非内联在 hook 里，是为了让 `useMasterOptions` 复用同一个 `queryFn`：
 * 同 key 同 fn 时 React Query 直接复用缓存，不会重复请求。</p>
 */
export function fetchMaterialBrands(): Promise<string[]> {
  return apiGet(ENDPOINTS.MATERIAL_BRANDS, brandListSchema)
}

/** 商品品牌(来自系统商品资料去重), 失败时返回空数组由调用方回退。 */
export function useMaterialBrands() {
  const query = useQuery({
    queryKey: MATERIAL_BRANDS_QUERY_KEY,
    queryFn: fetchMaterialBrands,
    enabled: Boolean(getToken()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return query.data ?? EMPTY_BRANDS
}
