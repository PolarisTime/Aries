import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'

const lineItemPayloadModules = [
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
  'invoice-receipt',
  'invoice-issue',
  'receipt',
  'payment',
]

for (const key of lineItemPayloadModules) {
  registerModuleBehavior(key, { savePayloadLineItems: true })
}

const extraScalarFieldsMap: Record<string, string[]> = {
  'freight-statement': ['attachment'],
  'purchase-order': ['buyerName'],
  'sales-order': ['salesName'],
  'sales-outbound': ['salesName'],
  'purchase-contract': ['buyerName'],
  'sales-contract': ['salesName'],
}

for (const [key, fields] of Object.entries(extraScalarFieldsMap)) {
  registerModuleBehavior(key, { extraScalarFields: fields })
}

registerModuleBehavior('freight-statement', { includeAttachmentIds: true })
registerModuleBehavior('receipt', { supportsStatementLinking: 'receipt' })
registerModuleBehavior('payment', { supportsStatementLinking: 'payment' })
