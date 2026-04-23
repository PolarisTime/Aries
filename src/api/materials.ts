import { http } from './client'
import {
  mockGetMaterialCategoryTree,
  mockListMaterials,
} from '@/mock/server'
import type { TableResponse } from '@/types/api'
import type {
  MaterialCategoryNode,
  MaterialListSearch,
  MaterialRecord,
} from '@/types/material'
import { isMockEnabled } from '@/utils/env'
import type { ListQueryOptions } from '@/utils/list'
import { buildListParams } from '@/utils/list'

export function listMaterials(
  search: MaterialListSearch,
  options: ListQueryOptions,
) {
  if (isMockEnabled) {
    return mockListMaterials(search, options)
  }

  return http.get<TableResponse<MaterialRecord>, TableResponse<MaterialRecord>>(
    '/material/list',
    {
      params: buildListParams(search, options),
    },
  )
}

export function getMaterialCategoryTree() {
  if (isMockEnabled) {
    return mockGetMaterialCategoryTree()
  }

  return http.get<MaterialCategoryNode[], MaterialCategoryNode[]>(
    '/materialCategory/getMaterialCategoryTree',
    {
      params: {
        id: '',
      },
    },
  )
}
