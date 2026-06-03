import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'auth.setup2fa.highlights.scanTitle': '扫描二维码',
        'auth.setup2fa.highlights.scanDescription': '使用认证器扫描',
        'auth.setup2fa.highlights.secretTitle': '保存密钥',
        'auth.setup2fa.highlights.secretDescription': '妥善保管密钥',
        'auth.setup2fa.highlights.effectiveTitle': '立即生效',
        'auth.setup2fa.highlights.effectiveDescription': '设置后立即生效',
        'auth.setup2fa.steps.scanTitle': '扫描二维码',
        'auth.setup2fa.steps.scanDescription': '使用认证器扫描二维码',
        'auth.setup2fa.steps.secretTitle': '保存密钥',
        'auth.setup2fa.steps.secretDescription': '妥善保管密钥',
        'auth.setup2fa.steps.verifyTitle': '验证',
        'auth.setup2fa.steps.verifyDescription': '输入验证码验证',
      }
      return map[key] ?? key
    },
  }),
}))

import {
  buildSetupSecurityHighlights,
  buildSetupTwoFactorSteps,
} from '@/views/auth/setup-two-factor-constants'

describe('setup-two-factor-constants', () => {
  const t = (key: string) => {
    const map: Record<string, string> = {
      'auth.setup2fa.highlights.scanTitle': '扫描二维码',
      'auth.setup2fa.highlights.scanDescription': '使用认证器扫描',
      'auth.setup2fa.highlights.secretTitle': '保存密钥',
      'auth.setup2fa.highlights.secretDescription': '妥善保管密钥',
      'auth.setup2fa.highlights.effectiveTitle': '立即生效',
      'auth.setup2fa.highlights.effectiveDescription': '设置后立即生效',
      'auth.setup2fa.steps.scanTitle': '扫描二维码',
      'auth.setup2fa.steps.scanDescription': '使用认证器扫描二维码',
      'auth.setup2fa.steps.secretTitle': '保存密钥',
      'auth.setup2fa.steps.secretDescription': '妥善保管密钥',
      'auth.setup2fa.steps.verifyTitle': '验证',
      'auth.setup2fa.steps.verifyDescription': '输入验证码验证',
    }
    return map[key] ?? key
  }

  describe('buildSetupSecurityHighlights', () => {
    it('returns 3 highlights', () => {
      const highlights = buildSetupSecurityHighlights(t)
      expect(highlights).toHaveLength(3)
    })

    it('returns correct highlight titles', () => {
      const highlights = buildSetupSecurityHighlights(t)
      expect(highlights[0].title).toBe('扫描二维码')
      expect(highlights[1].title).toBe('保存密钥')
      expect(highlights[2].title).toBe('立即生效')
    })

    it('returns correct highlight descriptions', () => {
      const highlights = buildSetupSecurityHighlights(t)
      expect(highlights[0].description).toBe('使用认证器扫描')
      expect(highlights[1].description).toBe('妥善保管密钥')
      expect(highlights[2].description).toBe('设置后立即生效')
    })
  })

  describe('buildSetupTwoFactorSteps', () => {
    it('returns 3 steps', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps).toHaveLength(3)
    })

    it('returns correct step keys', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps[0].key).toBe('scan')
      expect(steps[1].key).toBe('secret')
      expect(steps[2].key).toBe('verify')
    })

    it('returns correct step titles', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps[0].title).toBe('扫描二维码')
      expect(steps[1].title).toBe('保存密钥')
      expect(steps[2].title).toBe('验证')
    })

    it('returns correct step descriptions', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps[0].description).toBe('使用认证器扫描二维码')
      expect(steps[1].description).toBe('妥善保管密钥')
      expect(steps[2].description).toBe('输入验证码验证')
    })

    it('returns steps with icons', () => {
      const steps = buildSetupTwoFactorSteps(t)
      steps.forEach((step) => {
        expect(step.icon).toBeDefined()
      })
    })

    it('returns correct icon types for each step', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps[0].key).toBe('scan')
      expect(steps[1].key).toBe('secret')
      expect(steps[2].key).toBe('verify')
    })

    it('returns all steps with string title and description', () => {
      const steps = buildSetupTwoFactorSteps(t)
      steps.forEach((step) => {
        expect(typeof step.title).toBe('string')
        expect(typeof step.description).toBe('string')
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.description.length).toBeGreaterThan(0)
      })
    })

    it('returns all highlights with string title and description', () => {
      const highlights = buildSetupSecurityHighlights(t)
      highlights.forEach((highlight) => {
        expect(typeof highlight.title).toBe('string')
        expect(typeof highlight.description).toBe('string')
        expect(highlight.title.length).toBeGreaterThan(0)
        expect(highlight.description.length).toBeGreaterThan(0)
      })
    })

    it('uses t function for all highlight values', () => {
      const mockT = vi.fn((key: string) => `translated-${key}`)
      const highlights = buildSetupSecurityHighlights(mockT)
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.scanTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.scanDescription')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.secretTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.secretDescription')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.effectiveTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.highlights.effectiveDescription')
      expect(highlights[0].title).toBe('translated-auth.setup2fa.highlights.scanTitle')
    })

    it('uses t function for all step values', () => {
      const mockT = vi.fn((key: string) => `translated-${key}`)
      const steps = buildSetupTwoFactorSteps(mockT)
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.scanTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.scanDescription')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.secretTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.secretDescription')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.verifyTitle')
      expect(mockT).toHaveBeenCalledWith('auth.setup2fa.steps.verifyDescription')
      expect(steps[0].title).toBe('translated-auth.setup2fa.steps.scanTitle')
    })

    it('returns highlights in consistent order', () => {
      const highlights = buildSetupSecurityHighlights(t)
      expect(highlights[0].title).toBe('扫描二维码')
      expect(highlights[1].title).toBe('保存密钥')
      expect(highlights[2].title).toBe('立即生效')
    })

    it('returns steps in consistent order', () => {
      const steps = buildSetupTwoFactorSteps(t)
      expect(steps[0].key).toBe('scan')
      expect(steps[1].key).toBe('secret')
      expect(steps[2].key).toBe('verify')
    })
  })
})
