import dayjs from 'dayjs'
import { type Ref } from 'vue'
import { generateBusinessPrimaryNo } from '@/api/business'
import type { ModuleLineItem, ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { getStoredUser } from '@/utils/storage'
import {
  generatePrimaryNo as buildModulePrimaryNo,
  getModuleRecordPrimaryNo,
} from './module-adapter-shared'

interface UseModuleRecordHelpersOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
}

export function useModuleRecordHelpers(options: UseModuleRecordHelpersOptions) {
  function getCurrentOperatorName() {
    const user = getStoredUser()
    return String(user?.userName || user?.loginName || '当前用户')
  }

  function generatePrimaryNo() {
    const serial = String(Date.now()).slice(-6)
    const year = dayjs().format('YYYY')
    return buildModulePrimaryNo(options.moduleKey.value, year, serial)
  }

  async function generatePrimaryNoAsync() {
    try {
      return await generateBusinessPrimaryNo(options.moduleKey.value)
    } catch {
      return generatePrimaryNo()
    }
  }

  function getPrimaryNo(record: ModuleRecord) {
    return getModuleRecordPrimaryNo(record, options.config.value.primaryNoKey)
  }

  function getRowClassName(record: ModuleRecord) {
    const status = String(record.status || '')
    return options.config.value.rowHighlightStatuses?.includes(status) ? 'table-row-emphasis' : ''
  }

  function sumLineItemsBy(items: ModuleLineItem[], key: string) {
    return items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
  }

  return {
    generatePrimaryNo,
    generatePrimaryNoAsync,
    getCurrentOperatorName,
    getPrimaryNo,
    getRowClassName,
    sumLineItemsBy,
  }
}
