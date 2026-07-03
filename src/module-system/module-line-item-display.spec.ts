import { describe, expect, it, vi } from 'vitest'

const { isPurchaseWeighRequiredCategoryMock } = vi.hoisted(() => ({
  isPurchaseWeighRequiredCategoryMock: vi.fn(),
}))

vi.mock('@/constants/module-options', () => ({
  isPurchaseWeighRequiredCategory: isPurchaseWeighRequiredCategoryMock,
}))

import { shouldDisplayPieceWeightAsDash } from './module-line-item-display'

describe('shouldDisplayPieceWeightAsDash', () => {
  it('returns false for missing or non-object values', () => {
    expect(shouldDisplayPieceWeightAsDash()).toBe(false)
    expect(shouldDisplayPieceWeightAsDash(null)).toBe(false)
    expect(shouldDisplayPieceWeightAsDash('item')).toBe(false)
  })

  it('returns true for weigh settlement mode', () => {
    expect(
      shouldDisplayPieceWeightAsDash({
        settlementMode: ' 过磅 ',
        category: '普通材料',
      }),
    ).toBe(true)
    expect(isPurchaseWeighRequiredCategoryMock).not.toHaveBeenCalled()
  })

  it('delegates category checks when settlement mode is not weigh mode', () => {
    isPurchaseWeighRequiredCategoryMock.mockReturnValueOnce(true)

    expect(
      shouldDisplayPieceWeightAsDash({
        settlementMode: '理计',
        category: '线材',
      }),
    ).toBe(true)
    expect(isPurchaseWeighRequiredCategoryMock).toHaveBeenCalledWith('线材')
  })

  it('returns false when category does not require weighing', () => {
    isPurchaseWeighRequiredCategoryMock.mockReturnValueOnce(false)

    expect(shouldDisplayPieceWeightAsDash({ category: '板材' })).toBe(false)
  })
})
