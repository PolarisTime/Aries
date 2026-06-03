import { describe, it, expect } from 'vitest'
import {
  loginPayloadSchema,
  captchaDataSchema,
  login2faPayloadSchema,
  dataScopeSchema,
  loginResponseDataSchema,
  loginStep1ResponseSchema,
  totpSetupResponseSchema,
} from './auth'

describe('auth schemas', () => {
  describe('loginPayloadSchema', () => {
    it('should validate valid login payload', () => {
      const data = {
        loginName: 'user1',
        password: 'password123',
        remember: true,
      }
      const result = loginPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require loginName and password', () => {
      const data = { loginName: 'user1' }
      const result = loginPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty strings', () => {
      const data = { loginName: '', password: '' }
      const result = loginPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional fields', () => {
      const data = {
        loginName: 'user1',
        password: 'password123',
        captchaId: 'id',
        captchaCode: 'code',
      }
      const result = loginPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('captchaDataSchema', () => {
    it('should validate valid captcha data', () => {
      const data = {
        captchaId: '123',
        captchaImage: 'base64...',
        required: true,
      }
      const result = captchaDataSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require all fields', () => {
      const data = { captchaId: '123' }
      const result = captchaDataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('login2faPayloadSchema', () => {
    it('should validate valid 2FA payload', () => {
      const data = {
        tempToken: 'token',
        totpCode: '123456',
        remember: false,
      }
      const result = login2faPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require totpCode length 6', () => {
      const data = { tempToken: 'token', totpCode: '12345' }
      const result = login2faPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('dataScopeSchema', () => {
    it('should validate valid scopes', () => {
      expect(dataScopeSchema.safeParse('all').success).toBe(true)
      expect(dataScopeSchema.safeParse('department').success).toBe(true)
      expect(dataScopeSchema.safeParse('self').success).toBe(true)
      expect(dataScopeSchema.safeParse('custom').success).toBe(true)
    })

    it('should reject invalid scope', () => {
      expect(dataScopeSchema.safeParse('other').success).toBe(false)
    })
  })

  describe('loginResponseDataSchema', () => {
    it('should validate valid response', () => {
      const data = {
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: 1,
          loginName: 'user1',
        },
      }
      const result = loginResponseDataSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require accessToken', () => {
      const data = {
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: { id: 1, loginName: 'user1' },
      }
      const result = loginResponseDataSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('loginStep1ResponseSchema', () => {
    it('should validate valid step1 response', () => {
      const data = {
        requires2fa: true,
        tempToken: 'token',
      }
      const result = loginStep1ResponseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('totpSetupResponseSchema', () => {
    it('should validate valid TOTP setup', () => {
      const data = {
        qrCodeBase64: 'base64...',
        secret: 'secret',
      }
      const result = totpSetupResponseSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})