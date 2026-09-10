import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { getToken } from '@/utils/storage'

const brandListSchema = z.array(z.string())

/** 商品品牌(来自系统商品资料), 失败时返回空数组由调用方回退。 */
export function useMaterialBrands() {
  const query = useQuery({
    queryKey: ['price-compare', 'material-brands'],
    queryFn: () => apiGet(ENDPOINTS.MATERIAL_BRANDS, brandListSchema),
    enabled: Boolean(getToken()),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return query.data ?? []
}
