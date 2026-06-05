import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { exportModuleData } from '@/api/common-export'
import type { SearchParams } from '@/types/api-raw'
import { message } from '@/utils/antd-app'

export function useExcelExport(module: string) {
  const [exporting, setExporting] = useState(false)
  const { t } = useTranslation()

  const handleExport = async (params: SearchParams = {}) => {
    setExporting(true)
    try {
      await exportModuleData(module, params)
      message.success(t('hooks.excelExport.exportSuccess'))
      setExporting(false)
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('hooks.excelExport.exportFailed'),
      )
      setExporting(false)
    }
  }

  return { exporting, handleExport }
}
