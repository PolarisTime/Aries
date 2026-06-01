import { describe, expect, it } from 'vitest'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  computeTableScrollX,
  parseTableColumnWidth,
} from '@/views/modules/components/business-grid-table-utils'

describe('computeTableBodyScrollY', () => {
  it('should reserve space for table header and pagination', () => {
    expect(computeTableBodyScrollY(600, 48, 56)).toBe(496)
  })

  it('should keep a safe minimum height for small containers', () => {
    expect(computeTableBodyScrollY(220, 48, 56)).toBe(240)
  })
})

describe('parseTableColumnWidth', () => {
  it('should normalize numeric and px string widths', () => {
    expect(parseTableColumnWidth(150)).toBe(150)
    expect(parseTableColumnWidth('180px')).toBe(180)
  })

  it('should fall back for missing or non-numeric widths', () => {
    expect(parseTableColumnWidth(undefined)).toBe(120)
    expect(parseTableColumnWidth('max-content')).toBe(120)
  })
})

describe('computeTableScrollX', () => {
  it('should stretch narrow tables to the container width', () => {
    expect(
      computeTableScrollX({
        columnWidths: [140, '180px', undefined],
        containerWidth: 960,
        selectionColumnWidth: 40,
      }),
    ).toBeUndefined()
  })

  it('should keep horizontal scroll for wide tables', () => {
    expect(
      computeTableScrollX({
        columnWidths: [300, '320px', 280],
        containerWidth: 720,
        selectionColumnWidth: 40,
      }),
    ).toBe(940)
  })
})

describe('computeTableAvailableHeight', () => {
  it('should fill the remaining viewport when the flex container is short', () => {
    expect(
      computeTableAvailableHeight({
        containerHeight: 260,
        viewportHeight: 900,
        containerTop: 320,
        bottomInset: 16,
      }),
    ).toBe(564)
  })

  it('should keep the measured container height when it is larger', () => {
    expect(
      computeTableAvailableHeight({
        containerHeight: 640,
        viewportHeight: 900,
        containerTop: 320,
        bottomInset: 16,
      }),
    ).toBe(640)
  })
})

describe('buildTableScrollConfig', () => {
  it('should avoid Ant Design scroll containers for empty tables', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 0,
        isVirtual: false,
        scrollX: 940,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toBeUndefined()
  })

  it('should keep scroll config when table has rows', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 1,
        isVirtual: false,
        scrollX: 940,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toEqual({ x: 940, y: 480 })
  })

  it('should provide a numeric x value for virtual tables', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 120,
        isVirtual: true,
        scrollX: undefined,
        scrollY: 480,
        shellWidth: 720,
      }),
    ).toEqual({ x: 720, y: 480 })
  })
})
