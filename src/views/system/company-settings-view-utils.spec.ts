import { describe, expect, it } from 'vitest'

import {
  createEmptySettlementAccount,
  normalizeSettlementAccounts,
} from '@/views/system/company-settings-view-utils'

describe('company-settings-view-utils', () => {
  describe('createEmptySettlementAccount', () => {
    it('returns an object with expected fields', () => {
      const account = createEmptySettlementAccount()
      expect(account).toHaveProperty('accountName', '')
      expect(account).toHaveProperty('bankName', '')
      expect(account).toHaveProperty('bankAccount', '')
      expect(account).toHaveProperty('usageType', '通用')
      expect(account).toHaveProperty('status', '正常')
      expect(account).toHaveProperty('remark', '')
    })

    it('returns a new object each time', () => {
      const a = createEmptySettlementAccount()
      const b = createEmptySettlementAccount()
      expect(a).not.toBe(b)
      expect(a).toEqual(b)
    })
  })

  describe('normalizeSettlementAccounts', () => {
    it('returns a default empty account when input is null', () => {
      const result = normalizeSettlementAccounts(null)
      expect(result).toHaveLength(1)
      expect(result[0].accountName).toBe('')
    })

    it('returns a default empty account when input is undefined', () => {
      const result = normalizeSettlementAccounts(undefined)
      expect(result).toHaveLength(1)
    })

    it('returns a default empty account when input is empty array', () => {
      const result = normalizeSettlementAccounts([])
      expect(result).toHaveLength(1)
    })

    it('normalizes account fields to strings', () => {
      const input = [
        {
          id: '123',
          accountName: 'Test',
          bankName: 'Bank',
          bankAccount: '123456',
          usageType: '通用',
          status: '正常',
          remark: 'test',
        },
      ]
      const result = normalizeSettlementAccounts(input)
      expect(result).toHaveLength(1)
      expect(result[0].accountName).toBe('Test')
      expect(result[0].bankName).toBe('Bank')
      expect(result[0].bankAccount).toBe('123456')
      expect(result[0].id).toBe('123')
    })

    it('handles undefined id by setting it to undefined', () => {
      const input = [
        {
          id: undefined as never,
          accountName: 'Test',
          bankName: 'Bank',
          bankAccount: '123456',
          usageType: '通用',
          status: '正常',
          remark: '',
        },
      ]
      const result = normalizeSettlementAccounts(input)
      expect(result[0].id).toBeUndefined()
    })

    it('handles empty string id by setting it to undefined', () => {
      const input = [
        {
          id: '' as never,
          accountName: 'Test',
          bankName: 'Bank',
          bankAccount: '123456',
          usageType: '通用',
          status: '正常',
          remark: '',
        },
      ]
      const result = normalizeSettlementAccounts(input)
      expect(result[0].id).toBeUndefined()
    })

    it('defaults empty strings for missing fields', () => {
      const input = [
        {
          id: '1',
          accountName: undefined as never,
          bankName: undefined as never,
          bankAccount: undefined as never,
          usageType: undefined as never,
          status: undefined as never,
          remark: undefined as never,
        },
      ]
      const result = normalizeSettlementAccounts(input)
      expect(result[0].accountName).toBe('')
      expect(result[0].bankName).toBe('')
      expect(result[0].bankAccount).toBe('')
      expect(result[0].usageType).toBe('通用')
      expect(result[0].status).toBe('正常')
      expect(result[0].remark).toBe('')
    })

    it('preserves multiple accounts', () => {
      const input = [
        {
          id: '1',
          accountName: 'A',
          bankName: 'Bank1',
          bankAccount: '001',
          usageType: '通用',
          status: '正常',
          remark: '',
        },
        {
          id: '2',
          accountName: 'B',
          bankName: 'Bank2',
          bankAccount: '002',
          usageType: '收款',
          status: '正常',
          remark: '',
        },
      ]
      const result = normalizeSettlementAccounts(input)
      expect(result).toHaveLength(2)
      expect(result[0].accountName).toBe('A')
      expect(result[1].accountName).toBe('B')
    })
  })
})
