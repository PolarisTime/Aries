import { beforeEach, describe, expect, it, vi } from 'vitest'

const getModuleConfigMock = vi.hoisted(() => vi.fn())
const normalizeRecordMock = vi.hoisted(() => vi.fn())
const serializeBusinessRecordForSaveMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const httpPatchMock = vi.hoisted(() => vi.fn())
const restDeleteMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business-normalizers', () => ({
  normalizeRecord: normalizeRecordMock,
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

vi.mock('@/api/module-save-payload', () => ({
  serializeBusinessRecordForSave: serializeBusinessRecordForSaveMock,
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: {
    post: httpPostMock,
    get: httpGetMock,
    put: httpPutMock,
    patch: httpPatchMock,
  },
  restDelete: restDeleteMock,
}))

import {
  generateBusinessPrimaryNo,
  allocateBusinessPrimaryNo,
  getBusinessModuleDetail,
  saveBusinessModule,
  deleteBusinessModule,
  updateBusinessModuleStatus,
} from './business-crud'

describe('business-crud', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getModuleConfigMock.mockReturnValue({
      path: '/purchase-orders',
      readOnly: false,
      supportsDetail: true,
    })
    normalizeRecordMock.mockImplementation((data: Record<string, unknown>) => data)
    assertApiSuccessMock.mockImplementation(
      <T extends { code?: number }>(response: T) => {
        if (Number(response?.code) !== 0) {
          throw new Error((response as { message?: string }).message || '失败')
        }
        return response
      },
    )
  })

  describe('generateBusinessPrimaryNo', () => {
    it('generates and returns number', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { generatedNo: 'PO20260001' },
      })

      const result = await generateBusinessPrimaryNo('purchase-order')

      expect(httpPostMock).toHaveBeenCalledWith(
        '/general-settings/number-rule/next',
        null,
        { params: { moduleKey: 'purchase-order' } },
      )
      expect(result).toBe('PO20260001')
    })

    it('throws when generatedNo is empty', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { generatedNo: '' },
      })

      await expect(
        generateBusinessPrimaryNo('purchase-order'),
      ).rejects.toThrow('未配置可用编号规则')
    })
  })

  describe('allocateBusinessPrimaryNo', () => {
    it('returns generatedNo and generatedId', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { generatedNo: 'PO20260001', generatedId: '123' },
      })

      const result = await allocateBusinessPrimaryNo('purchase-order')

      expect(result).toEqual({
        generatedNo: 'PO20260001',
        generatedId: '123',
      })
    })

    it('throws when generatedNo is empty', async () => {
      httpPostMock.mockResolvedValue({
        code: 0,
        data: { generatedNo: '' },
      })

      await expect(
        allocateBusinessPrimaryNo('purchase-order'),
      ).rejects.toThrow('未配置可用编号规则')
    })
  })

  describe('getBusinessModuleDetail', () => {
    it('fetches and normalizes detail', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: { id: '1', name: 'test' },
      })
      normalizeRecordMock.mockReturnValue({ id: '1', name: 'test' })

      const result = await getBusinessModuleDetail('purchase-order', '1')

      expect(httpGetMock).toHaveBeenCalledWith('/purchase-orders/1')
      expect(result.data).toEqual({ id: '1', name: 'test' })
    })

    it('throws on readOnly without supportsDetail', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/read-only',
        readOnly: true,
        supportsDetail: false,
      })

      await expect(
        getBusinessModuleDetail('read-only', '1'),
      ).rejects.toThrow('当前模块不支持详情接口')
    })
  })

  describe('saveBusinessModule', () => {
    it('creates new record via POST', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: { id: 'new-id' } })
      serializeBusinessRecordForSaveMock.mockResolvedValue({
        name: 'test',
      })
      normalizeRecordMock.mockReturnValue({ id: 'new-id', name: 'test' })

      const record = { id: undefined, name: 'test' } as never
      const result = await saveBusinessModule('purchase-order', record)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/purchase-orders',
        { name: 'test' },
        undefined,
      )
      expect(result.data).toEqual({ id: 'new-id', name: 'test' })
    })

    it('updates existing record via PUT', async () => {
      httpPutMock.mockResolvedValue({ code: 0, data: { id: '1', name: 'updated' } })
      serializeBusinessRecordForSaveMock.mockResolvedValue({
        id: '1',
        name: 'updated',
      })
      normalizeRecordMock.mockReturnValue({ id: '1', name: 'updated' })

      const record = { id: '1', name: 'updated' } as never
      const result = await saveBusinessModule('purchase-order', record)

      expect(httpPutMock).toHaveBeenCalledWith('/purchase-orders/1', {
        id: '1',
        name: 'updated',
      })
      expect(result.data).toEqual({ id: '1', name: 'updated' })
    })

    it('includes preallocated headers for new record', async () => {
      httpPostMock.mockResolvedValue({ code: 0, data: { id: 'new' } })
      serializeBusinessRecordForSaveMock.mockResolvedValue({ name: 'test' })
      normalizeRecordMock.mockReturnValue({ id: 'new' })

      const record = {
        id: undefined,
        name: 'test',
        _preallocatedId: 'pre-123',
      } as never
      await saveBusinessModule('purchase-order', record)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/purchase-orders',
        { name: 'test' },
        {
          headers: {
            'X-Business-Module-Key': 'purchase-order',
            'X-Preallocated-Id': 'pre-123',
          },
        },
      )
    })

    it('throws on readOnly module', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/read-only',
        readOnly: true,
      })

      await expect(
        saveBusinessModule('read-only', {} as never),
      ).rejects.toThrow('当前模块不支持保存')
    })
  })

  describe('deleteBusinessModule', () => {
    it('deletes via restDelete', async () => {
      restDeleteMock.mockResolvedValue({ code: 0 })
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        readOnly: false,
      })

      await deleteBusinessModule('purchase-order', '1')

      expect(restDeleteMock).toHaveBeenCalledWith('/purchase-orders/1')
    })

    it('throws on readOnly module', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        readOnly: true,
      })

      await expect(
        deleteBusinessModule('purchase-order', '1'),
      ).rejects.toThrow('当前模块不支持删除')
    })
  })

  describe('updateBusinessModuleStatus', () => {
    it('patches status', async () => {
      httpPatchMock.mockResolvedValue({
        code: 0,
        data: { id: '1', status: '已审核' },
      })
      normalizeRecordMock.mockReturnValue({ id: '1', status: '已审核' })

      const result = await updateBusinessModuleStatus(
        'purchase-order',
        '1',
        '已审核',
      )

      expect(httpPatchMock).toHaveBeenCalledWith(
        '/purchase-orders/1/status',
        { status: '已审核' },
      )
      expect(result.data).toEqual({ id: '1', status: '已审核' })
    })

    it('throws on readOnly module', async () => {
      getModuleConfigMock.mockReturnValue({
        path: '/purchase-orders',
        readOnly: true,
      })

      await expect(
        updateBusinessModuleStatus('purchase-order', '1', '已审核'),
      ).rejects.toThrow('当前模块不支持状态变更')
    })
  })
})
