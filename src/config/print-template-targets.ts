import { businessPageConfigs } from '@/config/business-pages'

export interface PrintTemplateTargetOption {
  value: string
  label: string
}

export const allowedPrintTemplateTargetKeys = [
  'purchase-orders',
  'purchase-inbounds',
  'sales-orders',
  'sales-outbounds',
  'freight-bills',
  'purchase-contracts',
  'sales-contracts',
  'supplier-statements',
  'customer-statements',
  'freight-statements',
  'receipts',
  'payments',
  'invoice-receipts',
  'invoice-issues',
] as const

export const printTemplateTargetOptions: PrintTemplateTargetOption[] = allowedPrintTemplateTargetKeys
  .map((key) => businessPageConfigs[key])
  .filter((config) => Boolean(config))
  .map((config) => ({
    value: config.key,
    label: config.title,
  }))

export const printTemplateTargetMap = Object.fromEntries(
  printTemplateTargetOptions.map((item) => [item.value, item.label]),
) as Record<string, string>
