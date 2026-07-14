import { modulePageMetaMap } from '@/config/module-page-meta'

export interface PrintTemplateTargetOption {
  value: string
  label: string
}

const allowedPrintTemplateTargetKeys = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'purchase-contract',
  'sales-contract',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'payment',
] as const

export const printTemplateTargetOptions: PrintTemplateTargetOption[] =
  allowedPrintTemplateTargetKeys.flatMap((key) => {
    const config = modulePageMetaMap[key]
    return config ? [{ value: config.key, label: config.title }] : []
  })

export const printTemplateTargetMap = Object.fromEntries(
  printTemplateTargetOptions.map((item) => [item.value, item.label]),
) as Record<string, string>
