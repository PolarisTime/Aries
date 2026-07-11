import type { ReactNode } from 'react'
import { StatusTag } from '@/components/StatusTag'
import { getDisplayStatus } from '@/module-system/module-record-deletion'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface RenderModuleRecordStatusOptions {
  record: ModuleRecord
  statusKey: string
  statusMap?: ModulePageConfig['statusMap']
  renderFallback: (status: string) => ReactNode
}

export function renderModuleRecordStatus({
  record,
  statusKey,
  statusMap,
  renderFallback,
}: RenderModuleRecordStatusOptions) {
  const status = getDisplayStatus(record, statusKey)
  return statusMap ? (
    <StatusTag status={status} statusMap={statusMap} />
  ) : (
    renderFallback(status)
  )
}
