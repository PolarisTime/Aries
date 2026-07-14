import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIST_PAGE_SIZE_SETTING_CODE,
  isToggleSetting,
} from './settings-constants'

describe('isToggleSetting', () => {
  it('returns false for numeric settings', () => {
    expect(
      isToggleSetting({
        settingCode: DEFAULT_LIST_PAGE_SIZE_SETTING_CODE,
      } as any),
    ).toBe(false)
  })

  it('returns false for SYS_DEFAULT_TAX_RATE', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_DEFAULT_TAX_RATE' } as any),
    ).toBe(false)
  })

  it('returns false for SYS_MAX_CONCURRENT_SESSIONS', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_MAX_CONCURRENT_SESSIONS' } as any),
    ).toBe(false)
  })

  it('returns true for other SYS_ settings', () => {
    expect(isToggleSetting({ settingCode: 'SYS_ENABLE_FEATURE' } as any)).toBe(
      true,
    )
  })

  it('returns true for UI_ settings', () => {
    expect(isToggleSetting({ settingCode: 'UI_THEME' } as any)).toBe(true)
  })

  it('returns false for non-prefixed settings', () => {
    expect(isToggleSetting({ settingCode: 'CUSTOM_SETTING' } as any)).toBe(
      false,
    )
  })

  it('returns false for SYS_WATERMARK_CONTENT', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_WATERMARK_CONTENT' } as any),
    ).toBe(false)
  })

  it('returns false for SYS_WATERMARK_FONT_SIZE', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_WATERMARK_FONT_SIZE' } as any),
    ).toBe(false)
  })

  it('returns false for SYS_WATERMARK_ROTATE', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_WATERMARK_ROTATE' } as any),
    ).toBe(false)
  })

  it('returns false for SYS_WATERMARK_COLOR', () => {
    expect(isToggleSetting({ settingCode: 'SYS_WATERMARK_COLOR' } as any)).toBe(
      false,
    )
  })

  it('returns false for SYS_WATERMARK_DENSITY', () => {
    expect(
      isToggleSetting({ settingCode: 'SYS_WATERMARK_DENSITY' } as any),
    ).toBe(false)
  })

  it('returns false for empty settingCode', () => {
    expect(isToggleSetting({ settingCode: '' } as any)).toBe(false)
  })
})
