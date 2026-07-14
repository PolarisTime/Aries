import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('i18n', () => {
  const LOCALE_STORAGE_KEY = 'leo-locale'

  beforeEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('detectLocale', () => {
    it('returns stored locale from localStorage when present', async () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'en-US')
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('en-US')
    })

    it('returns zh-CN from navigator.language when no stored locale and lang starts with zh', async () => {
      vi.stubGlobal('navigator', { language: 'zh-CN' })
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('zh-CN')
    })

    it('returns en-US from navigator.language when no stored locale and lang starts with en', async () => {
      vi.stubGlobal('navigator', { language: 'en-US' })
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('en-US')
    })

    it('returns zh-CN as fallback when no stored locale and navigator.language is not zh or en', async () => {
      vi.stubGlobal('navigator', { language: 'ja-JP' })
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('zh-CN')
    })

    it('returns zh-CN when no stored locale and navigator is undefined', async () => {
      vi.stubGlobal('navigator', undefined)
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('zh-CN')
    })

    it('returns zh-CN when window is undefined', async () => {
      vi.stubGlobal('window', undefined)
      vi.stubGlobal('navigator', undefined)
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('zh-CN')
    })

    it('prefers localStorage over navigator.language', async () => {
      localStorage.setItem(LOCALE_STORAGE_KEY, 'zh-CN')
      vi.stubGlobal('navigator', { language: 'en-US' })
      const { detectLocale } = await import('./index')
      expect(detectLocale()).toBe('zh-CN')
    })
  })
})
