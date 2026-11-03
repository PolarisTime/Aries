// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  COLUMN_WIDTH_STEP,
  type ColumnWidthPrefs,
  clampColumnWidth,
  columnKeyOf,
  columnWidthsKey,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  readColumnWidths,
  resetColumnWidth,
  setColumnWidth,
  sheetKeyOf,
  stepColumnWidth,
  widthOf,
  writeColumnWidths,
} from './supplier-quote-column-widths'

describe('报价表列宽偏好（按供应商 + 类别 + 材质记忆）', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('宽度夹在 48–320；本地存储被改坏时退化为最小宽度', () => {
    expect(clampColumnWidth(47)).toBe(MIN_COLUMN_WIDTH)
    expect(clampColumnWidth(321)).toBe(MAX_COLUMN_WIDTH)
    expect(clampColumnWidth(Number.NaN)).toBe(MIN_COLUMN_WIDTH)
    expect(clampColumnWidth(Number.POSITIVE_INFINITY)).toBe(MIN_COLUMN_WIDTH)
    expect(clampColumnWidth(320.6)).toBe(MAX_COLUMN_WIDTH)
    expect(clampColumnWidth(64.4)).toBe(64)
  })

  it('写入后能按供应商原样读回', () => {
    const sheet = sheetKeyOf('直条', 'HRB400E')
    const prefs = setColumnWidth({}, sheet, columnKeyOf('中天', '9米'), 120)
    writeColumnWidths('s1', prefs)
    expect(readColumnWidths('s1')).toEqual(prefs)
    // 供应商之间互不影响
    expect(readColumnWidths('s2')).toEqual({})
    expect(columnWidthsKey('s1')).toContain('s1')
  })

  it('脏 JSON / 非法结构 / 非法值被丢弃，合法值仍然恢复', () => {
    window.localStorage.setItem(columnWidthsKey('s1'), '{oops')
    expect(readColumnWidths('s1')).toEqual({})

    window.localStorage.setItem(
      columnWidthsKey('s1'),
      JSON.stringify({
        sheet: { wide: 'wide', tooBig: 500, tooSmall: 40, ok: 100 },
        broken: 42,
        list: [1, 2],
      }),
    )
    expect(readColumnWidths('s1')).toEqual({
      sheet: { tooBig: MAX_COLUMN_WIDTH, tooSmall: MIN_COLUMN_WIDTH, ok: 100 },
    })
  })

  it('setColumnWidth 不可变：原偏好不被修改', () => {
    const base: ColumnWidthPrefs = { sheet: { a: 64 } }
    const next = setColumnWidth(base, 'sheet', 'b', 80)
    expect(base).toEqual({ sheet: { a: 64 } })
    expect(next).toEqual({ sheet: { a: 64, b: 80 } })
    expect(setColumnWidth(base, '', 'b', 80)).toBe(base)
  })

  it('resetColumnWidth 删列；该表没有自定义列时连表键一起删', () => {
    expect(resetColumnWidth({ sheet: { a: 64, b: 80 } }, 'sheet', 'a')).toEqual(
      { sheet: { b: 80 } },
    )
    expect(resetColumnWidth({ sheet: { a: 64 } }, 'sheet', 'a')).toEqual({})
    expect(resetColumnWidth({}, 'sheet', 'a')).toEqual({})
  })

  it('widthOf 命中用保存值，未命中用默认值（默认值也夹一遍）', () => {
    const prefs = { sheet: { a: 100 } }
    expect(widthOf(prefs, 'sheet', 'a', 64)).toBe(100)
    expect(widthOf(prefs, 'sheet', 'b', 64)).toBe(64)
    expect(widthOf(prefs, 'sheet', 'b', 2000)).toBe(MAX_COLUMN_WIDTH)
    expect(widthOf(prefs, 'missing', 'a', 64)).toBe(64)
  })

  it('清空偏好时删除本地存储键', () => {
    writeColumnWidths('s1', { sheet: { a: 100 } })
    expect(window.localStorage.getItem(columnWidthsKey('s1'))).not.toBeNull()
    writeColumnWidths('s1', {})
    expect(window.localStorage.getItem(columnWidthsKey('s1'))).toBeNull()
  })

  it('键盘加一档同样夹在合法区间', () => {
    expect(stepColumnWidth(64, COLUMN_WIDTH_STEP)).toBe(72)
    expect(stepColumnWidth(50, -COLUMN_WIDTH_STEP)).toBe(MIN_COLUMN_WIDTH)
    expect(stepColumnWidth(316, COLUMN_WIDTH_STEP)).toBe(MAX_COLUMN_WIDTH)
  })
})
