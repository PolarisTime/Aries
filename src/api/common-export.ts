import { buildFilterParams } from '@/api/business-listing-filtering'
import { http } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import type { SearchParams } from '@/types/api-raw'
import { downloadBlob } from '@/utils/download'

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const endpointConfig = getModuleConfig(module)
  const exportParams = buildFilterParams(module, params)
  const response = await http.post<Blob>(
    `${endpointConfig.path}/export`,
    exportParams,
    {
      params: exportParams,
      responseType: 'blob',
    },
  )
  downloadBlob(response, `${module}.xlsx`)
}
