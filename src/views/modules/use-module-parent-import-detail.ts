import { type Ref } from 'vue'
import { getBusinessModuleDetail } from '@/api/business'
import type { ModuleParentImportDefinition, ModuleRecord } from '@/types/module-page'

interface UseModuleParentImportDetailOptions {
  parentImportConfig: Ref<ModuleParentImportDefinition | undefined>
  isSuccessCode: (code: unknown) => boolean
}

export function useModuleParentImportDetail(options: UseModuleParentImportDetailOptions) {
  async function fetchParentImportDetail(record: ModuleRecord) {
    if (!options.parentImportConfig.value?.parentModuleKey) {
      return record
    }

    const response = await getBusinessModuleDetail(
      options.parentImportConfig.value.parentModuleKey,
      String(record.id),
    )
    if (!options.isSuccessCode(response.code) || !response.data) {
      throw new Error(response.message || '获取上级单据详情失败')
    }

    return response.data
  }

  return {
    fetchParentImportDetail,
  }
}
