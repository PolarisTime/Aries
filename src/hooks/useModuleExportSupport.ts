import { useState, useCallback } from 'react'
import { listAllBusinessModuleRows } from '@/api/business'
import { message } from '@/utils/antd-app'
import { exportRecordsToExcel } from '@/utils/export-excel'

export function useModuleExportSupport(moduleKey: string) {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const rows = await listAllBusinessModuleRows(moduleKey, {})
      exportRecordsToExcel(moduleKey, rows)
      message.success('导出成功')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '导出失败')
    } finally { setExporting(false) }
  }, [moduleKey])

  return { exporting, handleExport }
}
