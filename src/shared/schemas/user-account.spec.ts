import { describe, expect, it } from 'vitest'
import {
  departmentOptionRecordSchema,
  roleOptionRecordSchema,
  userAccountCreateResultSchema,
  userAccountFormPayloadSchema,
} from './user-account'

describe('user-account schemas', () => {
  describe('userAccountFormPayloadSchema', () => {
    it('should validate valid form payload', () => {
      const data = {
        loginName: 'user1',
        password: 'password123',
        userName: '用户1',
        mobile: '13800138000',
        departmentId: 'dept1',
        roleNames: ['admin', 'user'],
        dataScope: 'all',
        permissionSummary: '全部权限',
        status: '正常',
        remark: '备注',
      }
      const result = userAccountFormPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require loginName, userName, roleNames, etc.', () => {
      const data = { loginName: 'user1' }
      const result = userAccountFormPayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional password', () => {
      const data = {
        loginName: 'user1',
        userName: '用户1',
        mobile: '13800138000',
        roleNames: ['admin'],
        dataScope: 'all',
        permissionSummary: '全部权限',
        status: '正常',
        remark: '备注',
      }
      const result = userAccountFormPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow departmentId nullable', () => {
      const data = {
        loginName: 'user1',
        userName: '用户1',
        mobile: '13800138000',
        departmentId: null,
        roleNames: ['admin'],
        dataScope: 'all',
        permissionSummary: '全部权限',
        status: '正常',
        remark: '备注',
      }
      const result = userAccountFormPayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('userAccountCreateResultSchema', () => {
    it('should validate valid create result', () => {
      const data = {
        user: {
          id: '1',
          loginName: 'user1',
          userName: '用户1',
          mobile: '13800138000',
          departmentId: 'dept1',
          departmentName: '部门1',
          roleNames: ['admin'],
          dataScope: 'all',
          permissionSummary: '全部权限',
          lastLoginDate: '2024-01-01',
          status: '正常',
          remark: '备注',
          totpEnabled: false,
        },
        loginName: 'user1',
        initialPassword: 'password123',
        password: 'password123',
        totpSetup: {
          qrCodeBase64: 'base64...',
          secret: 'secret',
        },
      }
      const result = userAccountCreateResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require loginName and password', () => {
      const data = { loginName: 'user1' }
      const result = userAccountCreateResultSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional user and totpSetup', () => {
      const data = {
        loginName: 'user1',
        password: 'password123',
      }
      const result = userAccountCreateResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('departmentOptionRecordSchema', () => {
    it('should validate valid department option', () => {
      const data = {
        id: '1',
        departmentCode: 'D001',
        departmentName: '部门1',
      }
      const result = departmentOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should accept id as number', () => {
      const data = {
        id: 123,
        departmentName: '部门1',
      }
      const result = departmentOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require departmentName', () => {
      const data = { id: '1' }
      const result = departmentOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('roleOptionRecordSchema', () => {
    it('should validate valid role option', () => {
      const data = {
        id: '1',
        roleName: '管理员',
        roleCode: 'admin',
        status: '正常',
        dataScope: 'all',
        permissionSummary: '全部权限',
      }
      const result = roleOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require roleName and roleCode', () => {
      const data = { id: '1' }
      const result = roleOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional fields', () => {
      const data = {
        id: '1',
        roleName: '管理员',
        roleCode: 'admin',
      }
      const result = roleOptionRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
