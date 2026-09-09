import type { useTranslation } from 'react-i18next'
import { asString } from '@/utils/type-narrowing'

export const PROJECT_COLUMN_KEYS = [
  'projectCode',
  'projectName',
  'projectNameAbbr',
  'customerCode',
  'settlementCompanyName',
  'projectManager',
  'projectAddress',
  'status',
  'remark',
] as const

export type ProjectColumnKey = (typeof PROJECT_COLUMN_KEYS)[number]

export function displayProjectValue(value: unknown): string {
  const normalized = asString(value).trim()
  return normalized || '-'
}

export function buildProjectColumnLabels(
  t: ReturnType<typeof useTranslation>['t'],
): Record<ProjectColumnKey, string> {
  return {
    projectCode: t('modules.pages.project.projectCode'),
    projectName: t('modules.pages.project.projectName'),
    projectNameAbbr: t('modules.pages.project.projectNameAbbr'),
    customerCode: t('modules.pages.project.customer'),
    settlementCompanyName: t('modules.pages.project.settlementCompany'),
    projectManager: t('modules.pages.project.projectManager'),
    projectAddress: t('modules.pages.project.projectAddress'),
    status: t('modules.columns.status'),
    remark: t('modules.columns.remark'),
  }
}
