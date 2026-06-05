import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock, put: httpPutMock },
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    COMPANY_SETTINGS_CURRENT: '/company-settings/current',
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asNumber: (v: unknown) => Number(v) || 0,
  asString: (v: unknown) => String(v ?? ''),
}))

import {
  getCompanySettingProfile,
  normalizeProfile,
  saveCompanySettingProfile,
} from './company-settings'

describe('company-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('getCompanySettingProfile', () => {
    it('fetches and normalizes company profile', async () => {
      const rawData = {
        code: 0,
        data: {
          id: 1,
          companyName: '测试公司',
          taxNo: '91110000',
          bankName: '工商银行',
          bankAccount: '1234567890',
          taxRate: 0.13,
          status: '正常',
          settlementAccounts: [
            {
              id: 1,
              accountName: '基本户',
              bankName: '工商银行',
              bankAccount: '123456',
              usageType: '通用',
              status: '正常',
            },
          ],
        },
      }
      httpGetMock.mockResolvedValue(rawData)

      const result = await getCompanySettingProfile()

      expect(httpGetMock).toHaveBeenCalledWith('/company-settings/current')
      expect(result).not.toBeNull()
      expect(result!.companyName).toBe('测试公司')
      expect(result!.id).toBe('1')
      expect(result!.settlementAccounts).toHaveLength(1)
      expect(result!.settlementAccounts[0].id).toBe('1')
    })

    it('returns null when data is null', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })

      const result = await getCompanySettingProfile()

      expect(result).toBeNull()
    })

    it('returns null when data is undefined', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: undefined })

      const result = await getCompanySettingProfile()

      expect(result).toBeNull()
    })
  })

  describe('saveCompanySettingProfile', () => {
    it('saves and returns normalized profile', async () => {
      const rawData = {
        code: 0,
        data: {
          id: 2,
          companyName: '新公司',
          taxNo: '91110001',
          status: '正常',
          settlementAccounts: [],
        },
      }
      httpPutMock.mockResolvedValue(rawData)

      const payload = {
        companyName: '新公司',
        taxNo: '91110001',
        settlementAccounts: [],
        status: '正常',
      }
      const result = await saveCompanySettingProfile(payload)

      expect(httpPutMock).toHaveBeenCalledWith(
        '/company-settings/current',
        payload,
      )
      expect(result!.companyName).toBe('新公司')
      expect(result!.settlementAccounts).toEqual([])
    })
  })

  describe('normalizeProfile', () => {
    it('returns null for null input', () => {
      expect(normalizeProfile(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(normalizeProfile(undefined)).toBeNull()
    })

    it('sets bankName to undefined when falsy', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        bankName: '',
      })
      expect(result!.bankName).toBeUndefined()
    })

    it('sets bankAccount to undefined when falsy', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        bankAccount: '',
      })
      expect(result!.bankAccount).toBeUndefined()
    })

    it('sets taxRate to undefined when falsy', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        taxRate: 0,
      })
      expect(result!.taxRate).toBeUndefined()
    })

    it('defaults status to 正常 when empty', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        status: '',
      })
      expect(result!.status).toBe('正常')
    })

    it('returns empty array for non-array settlementAccounts', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        settlementAccounts: 'bad' as any,
      })
      expect(result!.settlementAccounts).toEqual([])
    })

    it('normalizes settlement account with null id', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        settlementAccounts: [{ id: null as any, accountName: 'A' }],
      })
      expect(result!.settlementAccounts[0].id).toBe('')
    })

    it('normalizes settlement account defaults', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        settlementAccounts: [{ accountName: 'A' }],
      })
      expect(result!.settlementAccounts[0].usageType).toBe('通用')
      expect(result!.settlementAccounts[0].status).toBe('正常')
    })

    it('preserves explicit usageType and status', () => {
      const result = normalizeProfile({
        companyName: 'C',
        taxNo: 'T',
        settlementAccounts: [
          { accountName: 'A', usageType: '专用', status: '停用' },
        ],
      })
      expect(result!.settlementAccounts[0].usageType).toBe('专用')
      expect(result!.settlementAccounts[0].status).toBe('停用')
    })
  })
})
