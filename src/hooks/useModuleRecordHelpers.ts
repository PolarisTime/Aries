import { getModuleRecordPrimaryNo } from '@/module-system/module-adapter-shared'
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
    const statuses = [asString(record.status), asString(record.signStatus)]
    return config.rowHighlightStatuses?.some((status) =>
      statuses.includes(status),
    )
      ? 'table-row-emphasis'
      : ''
  }

  return {
    getPrimaryNo,
    getRowClassName,
  }
}
