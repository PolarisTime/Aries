import { beforeEach, describe, expect, it, vi } from 'vitest'

const listAllBusinessModuleRowsMock = vi.hoisted(() => vi.fn())
const saveBusinessModuleMock = vi.hoisted(() => vi.fn())
const updatePageUploadRuleMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const httpPostMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business', () => ({
  listAllBusinessModuleRows: listAllBusinessModuleRowsMock,
  saveBusinessModule: saveBusinessModuleMock,
  updatePageUploadRule: updatePageUploadRuleMock,
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: {
    get: httpGetMock,
    post: httpPostMock,
    put: httpPutMock,
  },
}))

import {
  configureOssCors,
  getOssSetting,
  getStatementGeneratorRules,
  listSystemSettings,
  saveOssSetting,
  saveSystemSetting,
  testOssStorage,
  updateSystemUploadRule,
} from './system-settings'

describe('system-settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSystemSettings', () => {
    it('calls listAllBusinessModuleRows with general-setting', async () => {
      listAllBusinessModuleRowsMock.mockResolvedValue([{ id: '1' }])

      const result = await listSystemSettings()

      expect(listAllBusinessModuleRowsMock).toHaveBeenCalledWith(
        'general-setting',
        {},
      )
      expect(result).toEqual([{ id: '1' }])
    })
  })

  describe('saveSystemSetting', () => {
    it('calls saveBusinessModule with general-setting', async () => {
      const record = { id: '1', settingCode: 'SYS_TEST', status: '正常' }
      saveBusinessModuleMock.mockResolvedValue({ code: 0 })

      await saveSystemSetting(record)

      expect(saveBusinessModuleMock).toHaveBeenCalledWith(
        'general-setting',
        record,
      )
    })
  })

  describe('updateSystemUploadRule', () => {
    it('calls updatePageUploadRule with general-setting', async () => {
      const payload = { renamePattern: '{date}-{name}', status: '正常' }
      updatePageUploadRuleMock.mockResolvedValue({ code: 0 })

      await updateSystemUploadRule(payload)

      expect(updatePageUploadRuleMock).toHaveBeenCalledWith(
        'general-setting',
        payload,
      )
    })
  })

  describe('oss settings', () => {
    it('loads oss settings from system endpoint', async () => {
      const setting = {
        storageMode: 'server-s3',
        provider: 's3-compatible',
        endpoint: 'https://cos.example.com',
        bucket: 'bucket',
        region: 'ap-guangzhou',
        accessKey: 'ak',
        secretKeyConfigured: true,
        keyPrefix: 'attachments',
        pathStyleAccess: true,
        encryptedStorage: false,
        serverProxyOnly: true,
      }
      httpGetMock.mockResolvedValue({ code: 0, data: setting })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const result = await getOssSetting()

      expect(httpGetMock).toHaveBeenCalledWith('/system/oss-settings')
      expect(result).toEqual(setting)
    })

    it('saves oss settings to system endpoint', async () => {
      const payload = {
        storageMode: 'server-s3',
        provider: 's3-compatible',
        endpoint: 'https://cos.example.com',
        bucket: 'bucket',
        region: 'ap-guangzhou',
        accessKey: 'ak',
        secretKey: 'secret',
        keyPrefix: 'attachments',
        pathStyleAccess: true,
        encryptedStorage: false,
        serverProxyOnly: true,
      }
      httpPutMock.mockResolvedValue({ code: 0, data: { ...payload } })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      await saveOssSetting(payload)

      expect(httpPutMock).toHaveBeenCalledWith('/system/oss-settings', payload)
    })

    it('tests oss storage with current settings payload', async () => {
      const payload = {
        storageMode: 'server-s3',
        provider: 's3-compatible',
        endpoint: 'https://cos.example.com',
        bucket: 'bucket',
        region: 'ap-guangzhou',
        accessKey: 'ak',
        keyPrefix: 'attachments',
        pathStyleAccess: false,
        encryptedStorage: false,
        serverProxyOnly: true,
      }
      const result = {
        success: true,
        stage: 'DELETE',
        message: 'OSS 存储读写删除测试通过',
        objectKey: 'attachments/diagnostics/test.txt',
        details: ['写入测试对象成功'],
      }
      httpPostMock.mockResolvedValue({ code: 0, data: result })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const response = await testOssStorage(payload)

      expect(httpPostMock).toHaveBeenCalledWith(
        '/system/oss-settings/storage-test',
        payload,
      )
      expect(response).toEqual(result)
    })

    it('configures oss cors with explicit origin', async () => {
      const setting = {
        storageMode: 'server-s3',
        provider: 's3-compatible',
        endpoint: 'https://cos.example.com',
        bucket: 'bucket',
        region: 'ap-guangzhou',
        accessKey: 'ak',
        keyPrefix: 'attachments',
        pathStyleAccess: false,
        encryptedStorage: false,
        serverProxyOnly: false,
      }
      const result = {
        success: true,
        stage: 'CORS',
        message: 'OSS CORS 配置完成',
        objectKey: null,
        details: ['Origin: https://erp.example.com'],
      }
      httpPostMock.mockResolvedValue({ code: 0, data: result })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const response = await configureOssCors({
        setting,
        origin: 'https://erp.example.com',
        methods: ['GET', 'PUT', 'HEAD'],
      })

      expect(httpPostMock).toHaveBeenCalledWith('/system/oss-settings/cors', {
        setting,
        origin: 'https://erp.example.com',
        methods: ['GET', 'PUT', 'HEAD'],
      })
      expect(response).toEqual(result)
    })
  })

  describe('getStatementGeneratorRules', () => {
    it('fetches statement generator rules from singular endpoint', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          customerStatementReceiptAmountZero: true,
          supplierStatementFullPayment: false,
        },
      })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const result = await getStatementGeneratorRules()

      expect(httpGetMock).toHaveBeenCalledWith(
        '/general-settings/statement-generator-rule',
      )
      expect(result).toEqual({
        customerStatementReceiptAmountZero: true,
        supplierStatementFullPayment: false,
      })
    })

    it('falls back missing statement generator flags to false', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: undefined })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      await expect(getStatementGeneratorRules()).resolves.toEqual({
        customerStatementReceiptAmountZero: false,
        supplierStatementFullPayment: false,
      })
    })

    it('coerces partial statement generator flags to boolean values', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: {
          customerStatementReceiptAmountZero: 1,
        },
      })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      await expect(getStatementGeneratorRules()).resolves.toEqual({
        customerStatementReceiptAmountZero: true,
        supplierStatementFullPayment: false,
      })
    })
  })
})
