import { describe, expect, it } from 'vitest'
import {
  initialSetupAdminPayloadSchema,
  initialSetupCompanyPayloadSchema,
  initialSetupStatusSchema,
  initialSetupTotpPayloadSchema,
  initialSetupTotpResultSchema,
} from './setup'

describe('setup schemas', () => {
  describe('initialSetupStatusSchema', () => {
    it('should validate valid status', () => {
      const data = {
        setupRequired: true,
        adminConfigured: false,
        companyConfigured: false,
      }
      const result = initialSetupStatusSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require all fields', () => {
      const data = { setupRequired: true }
      const result = initialSetupStatusSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('initialSetupAdminPayloadSchema', () => {
    it('should validate valid admin payload', () => {
      const data = {
        loginName: 'admin',
        password: 'password123',
        userName: '管理员',
        mobile: '13800138000',
      }
      const result = initialSetupAdminPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require password min 6 chars', () => {
      const data = {
        loginName: 'admin',
        password: '12345',
        userName: '管理员',
      }
      const result = initialSetupAdminPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional mobile', () => {
      const data = {
        loginName: 'admin',
        password: 'password123',
        userName: '管理员',
      }
      const result = initialSetupAdminPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('initialSetupTotpPayloadSchema', () => {
    it('should validate valid TOTP payload', () => {
      const data = { loginName: 'admin' }
      const result = initialSetupTotpPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('initialSetupTotpResultSchema', () => {
    it('should validate valid TOTP result', () => {
      const data = {
        qrCodeBase64: 'base64...',
        secret: 'secret',
      }
      const result = initialSetupTotpResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('initialSetupCompanyPayloadSchema', () => {
    it('should validate valid company payload', () => {
      const data = {
        companyName: '公司名称',
        taxNo: '1234567890',
        bankName: '银行',
        bankAccount: '1234567890',
        taxRate: '13%',
        remark: '备注',
      }
      const result = initialSetupCompanyPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require companyName', () => {
      const data = { taxNo: '1234567890' }
      const result = initialSetupCompanyPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional fields', () => {
      const data = { companyName: '公司名称' }
      const result = initialSetupCompanyPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept taxRate as number', () => {
      const data = {
        companyName: '公司名称',
        taxRate: 13,
      }
      const result = initialSetupCompanyPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
