import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const httpDeleteMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())
const {
  fetchQueryMock,
  getQueryDataMock,
  invalidateQueriesMock,
  prefetchQueryMock,
  setQueryDataMock,
} = vi.hoisted(() => ({
  fetchQueryMock: vi.fn(),
  getQueryDataMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
  prefetchQueryMock: vi.fn(),
  setQueryDataMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: {
    delete: httpDeleteMock,
    get: httpGetMock,
    post: httpPostMock,
    put: httpPutMock,
  },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    fetchQuery: fetchQueryMock,
    getQueryData: getQueryDataMock,
    invalidateQueries: invalidateQueriesMock,
    prefetchQuery: prefetchQueryMock,
    setQueryData: setQueryDataMock,
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

vi.mock('@/utils/type-narrowing', () => ({
  asArray: <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []),
  asId: (v: unknown): string => {
    const value = String(v ?? '').trim()
    return /^\d+$/.test(value) && value !== '0' ? value : ''
  },
  asNumber: (v: unknown) => Number(v) || 0,
  asString: (v: unknown) => String(v ?? ''),
}))

import { QUERY_KEYS } from '@/constants/query-keys'
import {
  createCompanySetting,
  deleteCompanySetting,
  fetchSettlementCompanyOptions,
  getCompanySettingProfile,
  getSettlementCompanyOptions,
  listCompanySettings,
  normalizeProfile,
  normalizeSettlementCompanyOptions,
  reloadSettlementCompanyOptions,
  saveCompanySettingProfile,
  updateCompanySetting,
} from './company-settings'

describe('company-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    let queryCache: unknown
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
    fetchQueryMock.mockImplementation(async ({ queryFn }) => {
      const data = await queryFn()
      queryCache = data
      return data
    })
    getQueryDataMock.mockImplementation(() => queryCache)
    invalidateQueriesMock.mockResolvedValue(undefined)
    prefetchQueryMock.mockResolvedValue(undefined)
    setQueryDataMock.mockImplementation((_queryKey, data) => {
      queryCache = data
    })
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

  describe('listCompanySettings', () => {
    it('fetches and normalizes company setting page', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          content: [
            {
              id: 1,
              companyName: '主体A',
              taxNo: 'T1',
              status: '正常',
              settlementAccounts: [],
            },
          ],
        },
      })

      const result = await listCompanySettings()

      expect(httpGetMock).toHaveBeenCalledWith('/company-settings', {
        params: { page: 0, size: 200, sortBy: 'id', direction: 'asc' },
      })
      expect(result).toEqual([
        {
          id: '1',
          companyName: '主体A',
          taxNo: 'T1',
          bankName: undefined,
          bankAccount: undefined,
          taxRate: undefined,
          settlementAccounts: [],
          status: '正常',
          remark: '',
        },
      ])
    })

    it('filters empty company setting page records', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          content: [null],
        },
      })

      const result = await listCompanySettings()

      expect(result).toEqual([])
    })
  })

  describe('createCompanySetting', () => {
    it('posts payload and returns normalized profile', async () => {
      const payload = {
        companyName: '主体B',
        taxNo: 'T2',
        settlementAccounts: [],
        status: '正常',
      }
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { id: 2, ...payload },
      })

      const result = await createCompanySetting(payload)

      expect(httpPostMock).toHaveBeenCalledWith('/company-settings', payload)
      expect(result?.id).toBe('2')
      expect(result?.companyName).toBe('主体B')
    })
  })

  describe('updateCompanySetting', () => {
    it('puts payload to selected company setting', async () => {
      const payload = {
        companyName: '主体C',
        taxNo: 'T3',
        settlementAccounts: [],
        status: '正常',
      }
      httpPutMock.mockResolvedValue({
        code: 0,
        data: { id: 3, ...payload },
      })

      const result = await updateCompanySetting('3', payload)

      expect(httpPutMock).toHaveBeenCalledWith('/company-settings/3', payload)
      expect(result?.id).toBe('3')
      expect(result?.companyName).toBe('主体C')
    })
  })

  describe('deleteCompanySetting', () => {
    it('deletes selected company setting', async () => {
      const response = { code: 0, data: null }
      httpDeleteMock.mockResolvedValue(response)

      const result = await deleteCompanySetting('4')

      expect(httpDeleteMock).toHaveBeenCalledWith('/company-settings/4')
      expect(result).toBe(response)
    })
  })

  describe('settlement company options', () => {
    it('fetches and normalizes settlement company options', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [
          {
            id: '307698191887761408',
            companyName: '结算主体A',
            taxNo: 'T1',
            status: '正常',
          },
          { id: 0, companyName: '无效主体' },
          { id: 2, companyName: '' },
        ],
      })

      const result = await reloadSettlementCompanyOptions()

      expect(setQueryDataMock).toHaveBeenCalledWith(
        QUERY_KEYS.masterOptions.settlementCompany,
        [],
      )
      expect(invalidateQueriesMock).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.masterOptions.settlementCompany,
      })
      expect(fetchQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: QUERY_KEYS.masterOptions.settlementCompany,
          staleTime: 0,
        }),
      )
      expect(httpGetMock).toHaveBeenCalledWith('/company-settings/options')
      expect(result).toEqual([
        {
          id: '307698191887761408',
          value: '307698191887761408',
          label: '结算主体A',
          companyName: '结算主体A',
          taxNo: 'T1',
          status: '正常',
        },
      ])
      expect(getSettlementCompanyOptions()).toEqual(result)
    })

    it('exports fetchSettlementCompanyOptions', () => {
      expect(typeof fetchSettlementCompanyOptions).toBe('function')
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

  describe('normalizeSettlementCompanyOptions', () => {
    it('skips rows without valid id or companyName', () => {
      expect(
        normalizeSettlementCompanyOptions([
          { id: undefined, companyName: 'A' },
          { id: 1, companyName: '' },
        ]),
      ).toEqual([])
    })

    it('trims optional fields', () => {
      expect(
        normalizeSettlementCompanyOptions([
          {
            id: '2',
            companyName: '  主体B  ',
            taxNo: '  T2 ',
            status: ' 正常 ',
          },
        ]),
      ).toEqual([
        {
          id: '2',
          value: '2',
          label: '主体B',
          companyName: '主体B',
          taxNo: 'T2',
          status: '正常',
        },
      ])
    })

    it('omits blank optional fields', () => {
      expect(
        normalizeSettlementCompanyOptions([
          {
            id: '2',
            companyName: '主体B',
            taxNo: ' ',
            status: '',
          },
        ]),
      ).toEqual([
        {
          id: '2',
          value: '2',
          label: '主体B',
          companyName: '主体B',
          taxNo: undefined,
          status: undefined,
        },
      ])
    })
  })
})
