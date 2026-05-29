import dayjs from 'dayjs'

import i18next from 'i18next'
import { generateBusinessPrimaryNo } from '@/api/business'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'
import {
  generatePrimaryNo as buildModulePrimaryNo,
  getModuleRecordPrimaryNo,
} from '@/module-system/module-adapter-shared'

interface Props {
  moduleKey: string
  config: ModulePageConfig
}

export function useModuleRecordHelpers({ moduleKey, config }: Props) {
  const getCurrentOperatorName = () => {
    const user = getStoredUser()
    return String(
      user?.userName ||
        user?.loginName ||
        i18next.t('hooks.recordHelpers.currentUser'),
    )
  }

  const generatePrimaryNo = () => {
    const serial = String(Date.now()).slice(-6)
    const year = dayjs().format('YYYY')
    return buildModulePrimaryNo(moduleKey, year, serial)
  }

  const generatePrimaryNoAsync = async () => {
    try {
      return await generateBusinessPrimaryNo(moduleKey)
    } catch {
      return generatePrimaryNo()
    }
  }

  const getPrimaryNo = (record: ModuleRecord) =>
    getModuleRecordPrimaryNo(record, config.primaryNoKey)

  const getRowClassName = (record: ModuleRecord) => {
    const status = asString(record.status)
    return config.rowHighlightStatuses?.includes(status)
      ? 'table-row-emphasis'
      : ''
  }

  const sumLineItemsBy = (items: ModuleLineItem[], key: string) =>
    items.reduce((sum, item) => sum + Number(item[key] || 0), 0)

  return {
    generatePrimaryNo,
    generatePrimaryNoAsync,
    getCurrentOperatorName,
    getPrimaryNo,
    getRowClassName,
    sumLineItemsBy,
  }
}
