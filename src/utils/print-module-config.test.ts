import { describe, expect, it } from 'vitest'
import { getPrintItemFields } from './print-module-config'

describe('print statement item layouts', () => {
  it('matches the customer statement detail columns', () => {
    expect(
      getPrintItemFields('customer-statement').map((field) => field.key),
    ).toEqual([
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })

  it('matches the freight statement detail columns', () => {
    expect(
      getPrintItemFields('freight-statement').map((field) => field.key),
    ).toEqual([
      'sourceNo',
      'brand',
      'spec',
      'material',
      'category',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
    ])
  })
})
