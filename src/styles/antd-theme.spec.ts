import { theme } from 'antd'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/layouts/usePersonalSettings', () => ({
  getPersonalControlHeights: (fontSize: number) => ({
    controlHeight: Math.max(32, fontSize + 20),
    controlHeightSM: Math.max(24, fontSize + 12),
    controlHeightLG: Math.max(40, fontSize + 28),
  }),
}))

import { buildAntdTheme } from './antd-theme'

describe('buildAntdTheme', () => {
  it('returns default algorithm when darkMode is false', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.algorithm).toBe(theme.defaultAlgorithm)
  })

  it('returns dark algorithm when darkMode is true', () => {
    const result = buildAntdTheme({
      borderRadius: 6,
      fontSize: 14,
      darkMode: true,
    })
    expect(result.algorithm).toBe(theme.darkAlgorithm)
  })

  it('sets cssVar when cssVarKey is provided', () => {
    const result = buildAntdTheme({
      borderRadius: 6,
      fontSize: 14,
      cssVarKey: 'app',
    })
    expect(result.cssVar).toEqual({ key: 'app' })
  })

  it('does not set cssVar when cssVarKey is not provided', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.cssVar).toBeUndefined()
  })

  it('sets colorPrimary to #2458e6', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.token?.colorPrimary).toBe('#2458e6')
  })

  it('passes borderRadius to token', () => {
    const result = buildAntdTheme({ borderRadius: 8, fontSize: 14 })
    expect(result.token?.borderRadius).toBe(8)
  })

  it('passes fontSize to token', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 16 })
    expect(result.token?.fontSize).toBe(16)
  })

  it('sets fontFamily to the ANT_DESIGN_FONT_FAMILY', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.token?.fontFamily).toBe(
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    )
  })

  it('computes controlHeight from fontSize', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.token?.controlHeight).toBe(34)
  })

  it('computes controlHeightSM from fontSize', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.token?.controlHeightSM).toBe(26)
  })

  it('computes controlHeightLG from fontSize', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 14 })
    expect(result.token?.controlHeightLG).toBe(42)
  })

  it('clamps controlHeight to minimum 32', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 8 })
    expect(result.token?.controlHeight).toBe(32)
  })

  it('clamps controlHeightSM to minimum 24', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 8 })
    expect(result.token?.controlHeightSM).toBe(24)
  })

  it('clamps controlHeightLG to minimum 40', () => {
    const result = buildAntdTheme({ borderRadius: 6, fontSize: 8 })
    expect(result.token?.controlHeightLG).toBe(40)
  })
})
