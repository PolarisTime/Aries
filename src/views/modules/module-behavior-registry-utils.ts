import type { ModuleLineItem } from '@/types/module-page'
import { toStringArray } from '@/utils/normalizers'
import { asString } from '@/utils/type-narrowing'

export { toStringArray as normalizeBehaviorStringArray }

export function collectUniqueSourceNos(items: ModuleLineItem[]): string {
  return Array.from(
    new Set(
      items.map((item) => asString(item.sourceNo).trim()).filter(Boolean),
    ),
  ).join(', ')
}
