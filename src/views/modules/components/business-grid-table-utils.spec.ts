import { describe, expect, it } from 'vitest'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
  computeTableBodyScrollY,
  computeTableScrollX,
  parseTableColumnWidth,
} from './business-grid-table-utils'

describe('computeTableBodyScrollY', () => {
  it('returns computed value when larger than min', () => {
    expect(computeTableBodyScrollY(600, 64, 48)).toBe(488)
  })

  it('returns min when computed is smaller', () => {
    expect(computeTableBodyScrollY(200, 100, 80)).toBe(120)
  })
})

describe('parseTableColumnWidth', () => {
  it('returns number as-is when finite', () => {
    expect(parseTableColumnWidth(120)).toBe(120)
  })

  it('parses valid string', () => {
    expect(parseTableColumnWidth('150')).toBe(150)
  })

  it('returns default for invalid string', () => {
    expect(parseTableColumnWidth('abc')).toBe(120)
  })

  it('returns default for Infinity', () => {
    expect(parseTableColumnWidth(Infinity)).toBe(120)
  })

  it('returns default for null', () => {
    expect(parseTableColumnWidth(null)).toBe(120)
  })

  it('returns default for undefined', () => {
    expect(parseTableColumnWidth(undefined)).toBe(120)
  })
})

describe('computeTableScrollX', () => {
  it('returns contentWidth when containerWidth <= 0', () => {
    const result = computeTableScrollX({
      columnWidths: [120, 200],
      containerWidth: 0,
      selectionColumnWidth: 40,
    })
    expect(result).toBe(360)
  })

  it('returns undefined when content fits', () => {
    const result = computeTableScrollX({
      columnWidths: [120, 200],
      containerWidth: 1000,
      selectionColumnWidth: 40,
    })
    expect(result).toBeUndefined()
  })

  it('returns contentWidth when content overflows', () => {
    const result = computeTableScrollX({
      columnWidths: [120, 200],
      containerWidth: 300,
      selectionColumnWidth: 40,
    })
    expect(result).toBe(360)
  })
})

describe('computeTableAvailableHeight', () => {
  it('prefers the measured flex container height over viewport fallback', () => {
    const result = computeTableAvailableHeight({
      containerHeight: 400,
      viewportHeight: 800,
      containerTop: 100,
      bottomInset: 50,
    })
    expect(result).toBe(400)
  })

  it('uses viewport height only before the flex container is measured', () => {
    const result = computeTableAvailableHeight({
      containerHeight: 0,
      viewportHeight: 800,
      containerTop: 100,
      bottomInset: 50,
    })
    expect(result).toBe(650)
  })

  it('returns containerHeight when viewport params are invalid', () => {
    const result = computeTableAvailableHeight({
      containerHeight: 400,
      viewportHeight: 0,
      containerTop: -1,
      bottomInset: 50,
    })
    expect(result).toBe(400)
  })
})

describe('buildTableScrollConfig', () => {
  it('returns undefined for empty data', () => {
    expect(
      buildTableScrollConfig({
        dataLength: 0,
        isVirtual: false,
        scrollX: undefined,
        scrollY: 400,
        shellWidth: 800,
      }),
    ).toBeUndefined()
  })

  it('returns config with x for virtual scroll', () => {
    const config = buildTableScrollConfig({
      dataLength: 10,
      isVirtual: true,
      scrollX: undefined,
      scrollY: 400,
      shellWidth: 800,
    })
    expect(config).toEqual({ x: 800, y: 400 })
  })

  it('returns config with explicit scrollX for virtual', () => {
    const config = buildTableScrollConfig({
      dataLength: 10,
      isVirtual: true,
      scrollX: 500,
      scrollY: 400,
      shellWidth: 800,
    })
    expect(config).toEqual({ x: 500, y: 400 })
  })

  it('returns config with scrollX for non-virtual', () => {
    const config = buildTableScrollConfig({
      dataLength: 10,
      isVirtual: false,
      scrollX: 500,
      scrollY: 400,
      shellWidth: 800,
    })
    expect(config).toEqual({ x: 500, y: 400 })
  })
})
