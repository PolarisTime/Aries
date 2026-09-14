import i18next from 'i18next'
import { DOCUMENT_STATUS_REGISTRY } from '@/constants/document-status'
import type { ModuleStatusMeta } from '@/types/module-page'

export const statusMap: Record<string, ModuleStatusMeta> = Object.fromEntries(
  Object.entries(DOCUMENT_STATUS_REGISTRY).map(([status, meta]) => [
    status,
    { text: i18next.t(meta.i18nKey), color: meta.color },
  ]),
)

export const actionSet = [
  {
    key: 'create',
    label: i18next.t('modules.actions.create'),
    type: 'primary' as const,
  },
  {
    key: 'export',
    label: i18next.t('modules.actions.export'),
    type: 'default' as const,
  },
]
