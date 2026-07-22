import { buildFilterParams } from '@/api/business-listing-filtering'
import { downloadPost } from '@/api/client'
import { getModuleConfig } from '@/api/module-contracts'
import type { SearchParams } from '@/types/api-raw'
import { downloadBlob } from '@/utils/download'

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const endpointConfig = getModuleConfig(module)
  const exportParams = buildFilterParams(module, params)
  const response = await downloadPost(
    `${endpointConfig.path}/export`,
    exportParams,
    {
      params: exportParams,
    },
  )
  downloadBlob(response, `${module}.xlsx`)
}
