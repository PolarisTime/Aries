import { buildFilterParams } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { downloadPost } from '@/api/core/client'
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
