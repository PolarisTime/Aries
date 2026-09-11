import {
  fetchMaterialCategories,
  type MaterialCategoryOption,
} from '@/api/master/material-categories'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'

const materialCategories = createQueryCachedOptions<MaterialCategoryOption>({
  queryKey: QUERY_KEYS.masterOptions.materialCategories,
  fetch: fetchMaterialCategories,
})

export const reloadMaterialCategories = materialCategories.reload
