import { buildFilterParams } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { downloadPost } from '@/api/core/client'
import { withIdempotencyKey } from '@/api/core/idempotency'
import { ENDPOINTS } from '@/constants/endpoints'
import type { SearchParams } from '@/types/api-raw'
import { downloadBlob } from '@/utils/download'

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const exportParams = buildFilterParams(module, params)

  if (module === 'material') {
    const response = await downloadPost(
      ENDPOINTS.MATERIAL_EXPORTS,
      undefined,
      withIdempotencyKey({
        params: {
          keyword: exportParams.keyword ?? '',
          format: 'xlsx',
        },
      }),
    )
    downloadBlob(response, 'material.xlsx')
    return
  }

  const endpointConfig = getModuleConfig(module)
  const response = await downloadPost(
    `${endpointConfig.path}/export`,
    exportParams,
    withIdempotencyKey({
      params: exportParams,
    }),
  )
  downloadBlob(response, `${module}.xlsx`)
}
