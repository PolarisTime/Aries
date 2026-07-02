import { beforeEach, describe, expect, it, vi } from 'vitest'

const listAllBusinessModuleRowsMock = vi.hoisted(() => vi.fn())
const saveBusinessModuleMock = vi.hoisted(() => vi.fn())
const updatePageUploadRuleMock = vi.hoisted(() => vi.fn())
const isToggleSettingMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
const httpPutMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business', () => ({
  listAllBusinessModuleRows: listAllBusinessModuleRowsMock,
  saveBusinessModule: saveBusinessModuleMock,
  updatePageUploadRule: updatePageUploadRuleMock,
}))

vi.mock('@/module-system/settings-constants', () => ({
  isToggleSetting: isToggleSettingMock,
}))

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: {
    get: httpGetMock,
    put: httpPutMock,
  },
}))

import {
  DISPLAY_SWITCH_CODES,
  getOssSetting,
  getStatementGeneratorRules,
  isDisplaySwitchEnabled,
  listClientSettings,
  listDisplaySwitches,
  listSystemSettings,
  saveOssSetting,
  saveSystemSetting,
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
  })

  describe('listDisplaySwitches', () => {
    it('filters public client settings with isToggleSetting', async () => {
      httpGetMock.mockResolvedValue({
        code: 0,
        data: [
          { id: '1', settingCode: 'UI_SHOW_SNOWFLAKE_ID', status: '正常' },
          { id: '2', settingCode: 'SYS_TAX_RATE', status: '正常' },
        ],
      })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )
      isToggleSettingMock.mockImplementation(
        (record: { settingCode: string }) =>
          record.settingCode === 'UI_SHOW_SNOWFLAKE_ID',
      )

      const result = await listDisplaySwitches()

      expect(httpGetMock).toHaveBeenCalledWith(
        '/general-settings/client-setting',
      )
      expect(listAllBusinessModuleRowsMock).not.toHaveBeenCalled()
      expect(result).toEqual([
        { id: '1', settingCode: 'UI_SHOW_SNOWFLAKE_ID', status: '正常' },
      ])
    })
  })

  describe('listClientSettings', () => {
    it('fetches and returns client settings', async () => {
      const responseData = [
        { settingCode: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS', status: '正常' },
      ]
      httpGetMock.mockResolvedValue({ code: 0, data: responseData })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const result = await listClientSettings()

      expect(httpGetMock).toHaveBeenCalledWith(
        '/general-settings/client-setting',
      )
      expect(result).toEqual(responseData)
    })

    it('returns empty array when data is not an array', async () => {
      httpGetMock.mockResolvedValue({ code: 0, data: null })
      assertApiSuccessMock.mockImplementation(
        <T extends { code?: number }>(response: T) => response,
      )

      const result = await listClientSettings()

      expect(result).toEqual([])
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
  })

  describe('isDisplaySwitchEnabled', () => {
    it('returns true when matching setting has status 正常', () => {
      const rows = [
        { settingCode: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS', status: '正常' },
      ]
      expect(
        isDisplaySwitchEnabled(
          rows,
          DISPLAY_SWITCH_CODES.weightOnlyPurchaseInbounds,
        ),
      ).toBe(true)
    })

    it('returns false when status is not 正常', () => {
      const rows = [
        {
          settingCode: 'UI_WEIGHT_ONLY_PURCHASE_INBOUNDS',
          status: '停用',
        },
      ]
      expect(
        isDisplaySwitchEnabled(
          rows,
          DISPLAY_SWITCH_CODES.weightOnlyPurchaseInbounds,
        ),
      ).toBe(false)
    })

    it('returns false when setting not found', () => {
      expect(
        isDisplaySwitchEnabled([], DISPLAY_SWITCH_CODES.showSnowflakeId),
      ).toBe(false)
    })

    it('returns false when rows is undefined', () => {
      expect(
        isDisplaySwitchEnabled(undefined, DISPLAY_SWITCH_CODES.showSnowflakeId),
      ).toBe(false)
    })
  })
})
