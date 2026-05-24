import dayjs from 'dayjs'
import { useCallback } from 'react'
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
  const getCurrentOperatorName = useCallback(() => {
    const user = getStoredUser()
    return String(user?.userName || user?.loginName || '当前用户')
  }, [])

  const generatePrimaryNo = useCallback(() => {
    const serial = String(Date.now()).slice(-6)
    const year = dayjs().format('YYYY')
    return buildModulePrimaryNo(moduleKey, year, serial)
  }, [moduleKey])

  const generatePrimaryNoAsync = useCallback(async () => {
    try {
      return await generateBusinessPrimaryNo(moduleKey)
    } catch {
      return generatePrimaryNo()
    }
  }, [moduleKey, generatePrimaryNo])

  const getPrimaryNo = useCallback(
    (record: ModuleRecord) =>
      getModuleRecordPrimaryNo(record, config.primaryNoKey),
    [config.primaryNoKey],
  )

  const getRowClassName = useCallback(
    (record: ModuleRecord) => {
      const status = asString(record.status)
      return config.rowHighlightStatuses?.includes(status)
        ? 'table-row-emphasis'
        : ''
    },
    [config.rowHighlightStatuses],
  )

  const sumLineItemsBy = useCallback(
    (items: ModuleLineItem[], key: string) =>
      items.reduce((sum, item) => sum + Number(item[key] || 0), 0),
    [],
  )

  return {
    generatePrimaryNo,
    generatePrimaryNoAsync,
    getCurrentOperatorName,
    getPrimaryNo,
    getRowClassName,
    sumLineItemsBy,
  }
}
