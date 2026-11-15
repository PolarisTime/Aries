import i18next from 'i18next'
import { DOCUMENT_STATUS } from '@/constants/status-constants'
import type { ModuleOverviewItem, ModuleRecord } from '@/types/module-page'
import { formatInteger } from '../shared/shared'

export function buildOperationLogOverview(
  rows: ModuleRecord[],
): ModuleOverviewItem[] {
  return [
    {
      label: i18next.t('modules.pages.operationLog.logCount'),
      value: formatInteger(rows.length),
    },
    {
      label: i18next.t('modules.pages.operationLog.successCount'),
      value: formatInteger(
        rows.filter((row) => row.resultStatus === DOCUMENT_STATUS.SUCCESS)
          .length,
      ),
    },
    {
      label: i18next.t('modules.pages.operationLog.failedCount'),
      value: formatInteger(
        rows.filter((row) => row.resultStatus === DOCUMENT_STATUS.FAILED)
          .length,
      ),
    },
  ]
}
