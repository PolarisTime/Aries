import { isPurchaseWeighRequiredCategory } from '@/constants/module-options'
import { asString } from '@/utils/type-narrowing'

export function shouldDisplayPieceWeightAsDash(item?: unknown) {
  if (!item || typeof item !== 'object') {
    return false
  }
  const source = item as Record<string, unknown>
  if (asString(source.settlementMode).trim() === '过磅') {
    return true
  }
  return isPurchaseWeighRequiredCategory(source.category)
}
