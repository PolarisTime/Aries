import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'

const lineItemPayloadModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'customer-statement',
  'freight-statement',
] as const satisfies readonly ModuleKey[]

const extraScalarFieldsByModule = [
  ['freight-statement', ['attachment']],
  ['purchase-order', ['buyerName']],
  ['sales-order', ['salesName']],
  ['sales-outbound', ['salesName']],
] as const satisfies ReadonlyArray<readonly [ModuleKey, readonly string[]]>

export const contributeSaveBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
  for (const key of lineItemPayloadModules) {
    registerModuleBehavior(key, { savePayloadLineItems: true })
  }

  for (const [key, fields] of extraScalarFieldsByModule) {
    registerModuleBehavior(key, { extraScalarFields: [...fields] })
  }

  registerModuleBehavior('freight-statement', { includeAttachmentIds: true })
}
