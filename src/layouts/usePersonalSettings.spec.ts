/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fontSizeOptions } from './personal-settings-constants'
import { getPersonalControlHeights } from './usePersonalSettings'

/**
 * 全局控件高度契约(R1: 34→32 收敛)。
 *
 * 1. 默认 14px 字号下三档高度必须精确为 antd 默认密度 32 / 24 / 40,
 *    否则自定义元素(var(--app-control-height))会与 antd 控件错位。
 * 2. WCAG 2.2 AA 2.5.8 要求任何命中区不小于 24×24; 个人设置允许 11–18px
 *    字号, 最低档(SM)不得跌破 24, 否则表格行内按钮会失去合规命中区。
 * 3. variables.css 中 :root 的兜底值必须与 TS 侧默认值一致, 二者漂移会
 *    让 provider 之外的元素与 provider 内元素差 2px。
 */

const variablesCss = readFileSync(
  new URL('../styles/variables.css', import.meta.url),
  'utf8',
)

const WCAG_MIN_TARGET = 24

describe('getPersonalControlHeights', () => {
  it('默认 14px 字号下为 32 / 24 / 40(antd 默认密度)', () => {
    expect(getPersonalControlHeights(14)).toEqual({
      controlHeight: 32,
      controlHeightSM: 24,
      controlHeightLG: 40,
    })
  })

  it('所有可选字号下三档高度都不小于 24×24(WCAG 2.5.8)', () => {
    for (const fontSize of fontSizeOptions) {
      const { controlHeight, controlHeightSM, controlHeightLG } =
        getPersonalControlHeights(fontSize)
      expect(
        controlHeight,
        `fontSize=${fontSize} controlHeight`,
      ).toBeGreaterThanOrEqual(WCAG_MIN_TARGET)
      expect(
        controlHeightSM,
        `fontSize=${fontSize} controlHeightSM`,
      ).toBeGreaterThanOrEqual(WCAG_MIN_TARGET)
      expect(
        controlHeightLG,
        `fontSize=${fontSize} controlHeightLG`,
      ).toBeGreaterThanOrEqual(WCAG_MIN_TARGET)
    }
  })

  it('小号高度(SM)在常用字号下停在 24, 不再随字号下探', () => {
    for (const fontSize of [11, 12, 13, 14]) {
      expect(getPersonalControlHeights(fontSize).controlHeightSM).toBe(24)
    }
    // 放大字号(16/18)时 SM 随之增高, 但仍高于合规下限
    expect(getPersonalControlHeights(16).controlHeightSM).toBe(26)
    expect(getPersonalControlHeights(18).controlHeightSM).toBe(28)
  })

  it('三档高度随字号单调不减', () => {
    const heights = fontSizeOptions.map((fontSize) =>
      getPersonalControlHeights(fontSize),
    )
    for (let index = 1; index < heights.length; index += 1) {
      expect(heights[index].controlHeight).toBeGreaterThanOrEqual(
        heights[index - 1].controlHeight,
      )
      expect(heights[index].controlHeightSM).toBeGreaterThanOrEqual(
        heights[index - 1].controlHeightSM,
      )
      expect(heights[index].controlHeightLG).toBeGreaterThanOrEqual(
        heights[index - 1].controlHeightLG,
      )
    }
  })

  it('大号高度(LG)不低于 40, 满足按钮/大控件的视觉层级', () => {
    for (const fontSize of fontSizeOptions) {
      expect(
        getPersonalControlHeights(fontSize).controlHeightLG,
      ).toBeGreaterThanOrEqual(40)
    }
  })
})

describe('variables.css 控件高度兜底值', () => {
  it('与 TS 侧 14px 默认值一致(32 / 24 / 40)', () => {
    const expected = getPersonalControlHeights(14)
    expect(variablesCss).toContain(
      `--app-control-height: var(--ant-control-height, ${expected.controlHeight}px)`,
    )
    expect(variablesCss).toContain(
      `--app-control-height-sm: var(--ant-control-height-sm, ${expected.controlHeightSM}px)`,
    )
    expect(variablesCss).toContain(
      `--app-control-height-lg: var(--ant-control-height-lg, ${expected.controlHeightLG}px)`,
    )
  })
})
