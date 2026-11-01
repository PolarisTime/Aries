import { getModuleRecordPrimaryNo } from '@/module-system/adapter/module-adapter-shared'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  moduleKey: string
  config: ModulePageConfig
}

export function useModuleRecordHelpers({ config }: Props) {
  const getPrimaryNo = (record: ModuleRecord) =>
    getModuleRecordPrimaryNo(record, config.primaryNoKey)

  const getRowClassName = (record: ModuleRecord) => {
    // 行高亮只读 status：V208 已删除 st_freight_statement.sign_status 列，
    // 历史实现还读 record.signStatus，恒为 undefined（已删列残留）。
    return config.rowHighlightStatuses?.includes(asString(record.status))
      ? 'table-row-emphasis'
      : ''
  }

  return {
    getPrimaryNo,
    getRowClassName,
  }
}
