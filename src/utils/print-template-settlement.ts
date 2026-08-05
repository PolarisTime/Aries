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

  // 模板未绑定结算主体时为通用模板，适用于任何主体的单据（兜底）。
  return true
}

export function filterPrintTemplatesBySettlementCompany(
  templates: PrintTemplateRecord[],
  record?: ModuleRecord,
) {
  return templates.filter((template) =>
    matchesPrintTemplateSettlementCompany(template, record),
  )
}
