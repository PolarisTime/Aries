import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getToken } from '@/utils/storage'

const brandListSchema = z.array(z.string())

/** 稳定的空数组引用: 避免未加载时每次 render 返回新数组, 破坏调用方 useMemo。 */
const EMPTY_BRANDS: string[] = []

/** 商品品牌(来自系统商品资料), 失败时返回空数组由调用方回退。 */
export function useMaterialBrands() {
  const query = useQuery({
    queryKey: QUERY_KEYS.priceCompare.materialBrands,
    queryFn: () => apiGet(ENDPOINTS.MATERIAL_BRANDS, brandListSchema),
    enabled: Boolean(getToken()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return query.data ?? EMPTY_BRANDS
}
