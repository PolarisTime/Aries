import { beforeEach, describe, expect, it, vi } from 'vitest'

const listAllBusinessModuleRowsMock = vi.hoisted(() => vi.fn())
const saveBusinessModuleMock = vi.hoisted(() => vi.fn())
const updatePageUploadRuleMock = vi.hoisted(() => vi.fn())
const isToggleSettingMock = vi.hoisted(() => vi.fn())
const httpGetMock = vi.hoisted(() => vi.fn())
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
  },
}))

import {
  listSystemSettings,
  saveSystemSetting,
  updateSystemUploadRule,
  listDisplaySwitches,
  listClientSettings,
  isDisplaySwitchEnabled,
  DISPLAY_SWITCH_CODES,
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

  describe('listDisplaySwitches', () => {
    it('filters rows with isToggleSetting', async () => {
      listAllBusinessModuleRowsMock.mockResolvedValue([
        { id: '1', settingCode: 'UI_SHOW_SNOWFLAKE_ID', status: '正常' },
        { id: '2', settingCode: 'SYS_TAX_RATE', status: '正常' },
      ])
      isToggleSettingMock.mockImplementation(
        (record: { settingCode: string }) =>
          record.settingCode === 'UI_SHOW_SNOWFLAKE_ID',
      )

      const result = await listDisplaySwitches()

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
