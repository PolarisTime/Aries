import { describe, expect, it } from 'vitest'

import type { ModuleRecord } from '@/types/module-page'

import {
  DETAILED_OPERATION_ACTION_OPTIONS,
  DETAILED_OPERATION_ACTION_VALUES,
  formatSettingValue,
  GENERAL_SETTING_STATUS_OPTIONS,
  HIDE_AUDITED_STATUS_OPTIONS,
  HIDE_AUDITED_STATUS_VALUES,
  isDefaultListPageSizeSetting,
  isDefaultTaxRateSetting,
  isDetailedOperationLogSetting,
  isHideAuditedListRecordsSetting,
  isNumericSetting,
  isWatermarkContentSetting,
  isWatermarkPropSetting,
  matchesGeneralSettingKeyword,
  resolveDefaultTaxRateValue,
  resolveDetailedOperationActionValues,
  resolveHideAuditedStatusValues,
  SYSTEM_SWITCH_HELP_TEXT,
  WATERMARK_COLOR_CODE,
  WATERMARK_DENSITY_CODE,
  WATERMARK_FONT_SIZE_CODE,
} from '@/views/system/general-settings-view-utils'

function makeRecord(partial: Partial<ModuleRecord> = {}): ModuleRecord {
  return {
    id: '1',
    settingCode: '',
    settingName: '',
    billName: '',
    prefix: '',
    dateRule: '',
    serialLength: 6,
    resetRule: '',
    sampleNo: '',
    status: '',
    remark: '',
    ruleType: '',
    moduleKey: '',
    ...partial,
  }
}

describe('general-settings-view-utils', () => {
  describe('constants', () => {
    it('WATERMARK_FONT_SIZE_CODE is defined', () => {
      expect(WATERMARK_FONT_SIZE_CODE).toBe('SYS_WATERMARK_FONT_SIZE')
    })

    it('WATERMARK_COLOR_CODE is defined', () => {
      expect(WATERMARK_COLOR_CODE).toBe('SYS_WATERMARK_COLOR')
    })

    it('WATERMARK_DENSITY_CODE is defined', () => {
      expect(WATERMARK_DENSITY_CODE).toBe('SYS_WATERMARK_DENSITY')
    })

    it('SYSTEM_SWITCH_HELP_TEXT is an object', () => {
      expect(typeof SYSTEM_SWITCH_HELP_TEXT).toBe('object')
    })

    it('DETAILED_OPERATION_ACTION_OPTIONS has 8 items', () => {
      expect(DETAILED_OPERATION_ACTION_OPTIONS).toHaveLength(8)
    })

    it('DETAILED_OPERATION_ACTION_VALUES has 8 items', () => {
      expect(DETAILED_OPERATION_ACTION_VALUES).toHaveLength(8)
    })

    it('HIDE_AUDITED_STATUS_OPTIONS has 9 items', () => {
      expect(HIDE_AUDITED_STATUS_OPTIONS).toHaveLength(9)
    })

    it('HIDE_AUDITED_STATUS_VALUES has 9 items', () => {
      expect(HIDE_AUDITED_STATUS_VALUES).toHaveLength(9)
    })

    it('GENERAL_SETTING_STATUS_OPTIONS has 2 items', () => {
      expect(GENERAL_SETTING_STATUS_OPTIONS).toHaveLength(2)
      const values = GENERAL_SETTING_STATUS_OPTIONS.map((o) => o.value)
      expect(values).toContain('正常')
      expect(values).toContain('禁用')
    })
  })

  describe('isDefaultTaxRateSetting', () => {
    it('returns true for SYS_DEFAULT_TAX_RATE', () => {
      expect(isDefaultTaxRateSetting(makeRecord({ settingCode: 'SYS_DEFAULT_TAX_RATE' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isDefaultTaxRateSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isDefaultListPageSizeSetting', () => {
    it('returns true for matching code', () => {
      expect(isDefaultListPageSizeSetting(makeRecord({ settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isDefaultListPageSizeSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isWatermarkContentSetting', () => {
    it('returns true for SYS_WATERMARK_CONTENT', () => {
      expect(isWatermarkContentSetting(makeRecord({ settingCode: 'SYS_WATERMARK_CONTENT' }))).toBe(true)
    })

    it('returns true for SYS_WATERMARK_COLOR', () => {
      expect(isWatermarkContentSetting(makeRecord({ settingCode: 'SYS_WATERMARK_COLOR' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isWatermarkContentSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isWatermarkPropSetting', () => {
    it('returns true for SYS_WATERMARK_FONT_SIZE', () => {
      expect(isWatermarkPropSetting(makeRecord({ settingCode: 'SYS_WATERMARK_FONT_SIZE' }))).toBe(true)
    })

    it('returns true for SYS_WATERMARK_ROTATE', () => {
      expect(isWatermarkPropSetting(makeRecord({ settingCode: 'SYS_WATERMARK_ROTATE' }))).toBe(true)
    })

    it('returns true for SYS_WATERMARK_DENSITY', () => {
      expect(isWatermarkPropSetting(makeRecord({ settingCode: 'SYS_WATERMARK_DENSITY' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isWatermarkPropSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isDetailedOperationLogSetting', () => {
    it('returns true for matching code', () => {
      expect(isDetailedOperationLogSetting(makeRecord({ settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isDetailedOperationLogSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isHideAuditedListRecordsSetting', () => {
    it('returns true for matching code', () => {
      expect(isHideAuditedListRecordsSetting(makeRecord({ settingCode: 'UI_HIDE_AUDITED_LIST_RECORDS' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isHideAuditedListRecordsSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isNumericSetting', () => {
    it('returns true for tax rate', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'SYS_DEFAULT_TAX_RATE' }))).toBe(true)
    })

    it('returns true for max concurrent sessions', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'SYS_MAX_CONCURRENT_SESSIONS' }))).toBe(true)
    })

    it('returns true for default list page size', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE' }))).toBe(true)
    })

    it('returns false for other codes', () => {
      expect(isDefaultListPageSizeSetting(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })

    it('returns true for watermark prop', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'SYS_WATERMARK_FONT_SIZE' }))).toBe(true)
    })

    it('returns true for watermark content', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'SYS_WATERMARK_CONTENT' }))).toBe(true)
    })

    it('returns false for toggle settings', () => {
      expect(isNumericSetting(makeRecord({ settingCode: 'SYS_BATCH_NO_AUTO_GENERATE' }))).toBe(false)
    })
  })

  describe('matchesGeneralSettingKeyword', () => {
    const record = makeRecord({
      settingCode: 'SYS_DEFAULT_TAX_RATE',
      settingName: '默认税率',
      billName: '系统设置',
      remark: '税率配置',
    })

    it('returns true for empty keyword', () => {
      expect(matchesGeneralSettingKeyword(record, '')).toBe(true)
      expect(matchesGeneralSettingKeyword(record, '   ')).toBe(true)
    })

    it('matches settingCode', () => {
      expect(matchesGeneralSettingKeyword(record, 'TAX_RATE')).toBe(true)
    })

    it('matches settingName', () => {
      expect(matchesGeneralSettingKeyword(record, '税率')).toBe(true)
    })

    it('matches billName', () => {
      expect(matchesGeneralSettingKeyword(record, '系统')).toBe(true)
    })

    it('matches remark', () => {
      expect(matchesGeneralSettingKeyword(record, '配置')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(matchesGeneralSettingKeyword(record, 'tax_rate')).toBe(true)
    })

    it('returns false for non-matching keyword', () => {
      expect(matchesGeneralSettingKeyword(record, 'nonexistent')).toBe(false)
    })
  })

  describe('formatSettingValue', () => {
    it('formats tax rate as percentage', () => {
      const record = makeRecord({
        settingCode: 'SYS_DEFAULT_TAX_RATE',
        sampleNo: '0.13',
      })
      expect(formatSettingValue(record)).toBe('13%')
    })

    it('returns default 13% for zero tax rate', () => {
      const record = makeRecord({
        settingCode: 'SYS_DEFAULT_TAX_RATE',
        sampleNo: '0',
      })
      expect(formatSettingValue(record)).toBe('13%')
    })

    it('formats max concurrent sessions', () => {
      const record = makeRecord({
        settingCode: 'SYS_MAX_CONCURRENT_SESSIONS',
        sampleNo: '5',
      })
      expect(formatSettingValue(record)).toBe('5')
    })

    it('formats watermark content as element', () => {
      const record = makeRecord({
        settingCode: 'SYS_WATERMARK_CONTENT',
        sampleNo: 'test',
      })
      const result = formatSettingValue(record)
      expect(result).toBeDefined()
    })

    it('formats generic setting', () => {
      const record = makeRecord({
        settingCode: 'OTHER',
        sampleNo: 'value',
      })
      expect(formatSettingValue(record)).toBe('value')
    })
  })

  describe('resolveDetailedOperationActionValues', () => {
    it('returns all actions for empty input', () => {
      const result = resolveDetailedOperationActionValues('')
      expect(result).toEqual(DETAILED_OPERATION_ACTION_VALUES)
    })

    it('returns matching actions from comma-separated string', () => {
      const result = resolveDetailedOperationActionValues('QUERY,DETAIL')
      expect(result).toContain('QUERY')
      expect(result).toContain('DETAIL')
    })

    it('filters out invalid values', () => {
      const result = resolveDetailedOperationActionValues('QUERY,INVALID')
      expect(result).toContain('QUERY')
      expect(result).not.toContain('INVALID')
    })
  })

  describe('resolveHideAuditedStatusValues', () => {
    it('returns default ["已审核"] for empty input', () => {
      const result = resolveHideAuditedStatusValues('')
      expect(result).toEqual(['已审核'])
    })

    it('returns matching statuses from comma-separated string', () => {
      const result = resolveHideAuditedStatusValues('已审核,已完成')
      expect(result).toContain('已审核')
      expect(result).toContain('已完成')
    })
  })

  describe('resolveDefaultTaxRateValue', () => {
    it('returns 0 when no rows', () => {
      expect(resolveDefaultTaxRateValue(undefined)).toBe(0)
    })

    it('returns 0 when no matching row', () => {
      expect(resolveDefaultTaxRateValue([makeRecord({ settingCode: 'OTHER' })])).toBe(0)
    })

    it('returns tax rate value when matching row exists', () => {
      const rows = [
        makeRecord({ settingCode: 'SYS_DEFAULT_TAX_RATE', sampleNo: '0.13' }),
      ]
      expect(resolveDefaultTaxRateValue(rows)).toBe(0.13)
    })

    it('returns 0 for non-finite value', () => {
      const rows = [
        makeRecord({ settingCode: 'SYS_DEFAULT_TAX_RATE', sampleNo: 'abc' }),
      ]
      expect(resolveDefaultTaxRateValue(rows)).toBe(0)
    })
  })
})
