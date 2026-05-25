import { http } from '@/api/client'
import type { SearchParams } from '@/types/api-raw'
import { downloadBlob } from '@/utils/download'

export async function exportModuleData(
  module: string,
  params: SearchParams,
): Promise<void> {
  const response = await http.instance.post(`/${module}/export`, params, {
    responseType: 'blob',
  })
  downloadBlob(response.data as Blob, `${module}.xlsx`)
}
