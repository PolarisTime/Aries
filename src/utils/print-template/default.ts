import type { PrintTemplateRecord } from '@/shared/schemas'

export function pickDefaultPrintTemplate(
  templates: PrintTemplateRecord[],
): PrintTemplateRecord | undefined {
  return (
    templates.find((template) => template.isDefault === true) ?? templates[0]
  )
}
