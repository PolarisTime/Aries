import i18next from 'i18next'
import {
  getPrintTemplateTargetTitle,
  type PrintTemplateTranslate,
} from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/shared/schemas'

export function getPrintTemplateBillTypeLabel(
  value: string | undefined,
  t: PrintTemplateTranslate,
) {
  if (!value) return '--'
  return getPrintTemplateTargetTitle(value, t) || value
}

export function buildPrintTemplateCopyName(record: PrintTemplateRecord) {
  return `${record.templateName} ${i18next.t('system.printTemplateUtils.copySuffix')}`
}
