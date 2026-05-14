import { useCallback, useState } from 'react'
import { exportModuleData } from '@/api/common-export'
import type { SearchParams } from '@/types/api-raw'
import { message } from '@/utils/antd-app'

export function useExcelExport(module: string) {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(
    async (params: SearchParams = {}) => {
      setExporting(true)
      try {
        await exportModuleData(module, params)
        message.success('导出完成')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '导出失败')
      } finally {
        setExporting(false)
      }
    },
    [module],
  )

  return { exporting, handleExport }
}
