import type { PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'

function normalizedText(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function matchesPrintTemplateSettlementCompany(
  template: PrintTemplateRecord,
  record?: ModuleRecord,
) {
  const recordCompanyId = normalizedText(record?.settlementCompanyId)
  const recordCompanyName = normalizedText(record?.settlementCompanyName)
  const templateCompanyId = normalizedText(template.settlementCompanyId)
  const templateCompanyName = normalizedText(template.settlementCompanyName)

  if (templateCompanyId) {
    if (recordCompanyId) {
      return templateCompanyId === recordCompanyId
    }
    return Boolean(
      templateCompanyName && recordCompanyName === templateCompanyName,
    )
  }

  if (templateCompanyName) {
    return recordCompanyName === templateCompanyName
  }

  return !recordCompanyId && !recordCompanyName
}

export function filterPrintTemplatesBySettlementCompany(
  templates: PrintTemplateRecord[],
  record?: ModuleRecord,
) {
  return templates.filter((template) =>
    matchesPrintTemplateSettlementCompany(template, record),
  )
}
