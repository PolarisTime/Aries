import i18next from 'i18next'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/types/print-template'

export function getPrintTemplateBillTypeLabel(value?: string) {
  if (!value) return '--'
  return printTemplateTargetMap[value] || value
}

export function buildPrintTemplateCopyName(record: PrintTemplateRecord) {
  return `${record.templateName} ${i18next.t('system.printTemplateUtils.copySuffix')}`
}
