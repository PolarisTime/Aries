import { describe, expect, it, vi } from 'vitest'
import { cloneLineItems, transformFreightItems } from './shared-line-items'

describe('transformFreightItems', () => {
  it('transforms parent record items to freight line items', () => {
    const result = transformFreightItems({
      outboundNo: 'OB2024001',
      customerName: '客户A',
      projectName: '项目X',
      warehouseName: '一号库',
      items: [
        {
          materialCode: 'M001',
          materialName: '螺纹钢',
          brand: '宝钢',
          category: '螺纹钢',
          material: 'HRB400',
          spec: 'Φ25',
          length: '12m',
          pieceWeightTon: 0.05,
          piecesPerBundle: 100,
          batchNo: 'B2024001',
          quantity: 10,
          quantityUnit: '件',
          weightTon: 0.5,
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].sourceNo).toBe('OB2024001')
    expect(result[0].customerName).toBe('客户A')
    expect(result[0].projectName).toBe('项目X')
    expect(result[0].materialCode).toBe('M001')
    expect(result[0].materialName).toBe('螺纹钢')
    expect(result[0].warehouseName).toBe('一号库')
    expect(result[0].quantity).toBe(10)
  })

  it('falls back materialName to brand when explicit name is empty', () => {
    const result = transformFreightItems({
      outboundNo: 'OB2024002',
      items: [
        {
          materialName: '',
          brand: '宝钢',
          material: 'HRB400',
        },
      ],
    })

    expect(result[0].materialName).toBe('宝钢')
  })

  it('handles items with only whitespace materialName', () => {
    const result = transformFreightItems({
      outboundNo: 'OB2024003',
      items: [
        {
          materialName: '  ',
          brand: '鞍钢',
          material: 'HRB500',
        },
      ],
    })

    expect(result[0].materialName).toBe('鞍钢')
  })

  it('handles missing parent items gracefully', () => {
    const result = transformFreightItems({
      outboundNo: 'OB2024004',
      items: undefined,
    })

    expect(result).toEqual([])
  })

  it('fills defaults when parent and item fields are missing', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123)

    const result = transformFreightItems({
      items: [{}],
    })

    expect(result[0]).toMatchObject({
      id: 'freight-item-123-1',
      sourceNo: '',
      brand: '',
      material: '',
    })

    nowSpy.mockRestore()
  })
})

describe('cloneLineItems', () => {
  it('is re-exported from shared-line-items', () => {
    expect(typeof cloneLineItems).toBe('function')
  })
})
