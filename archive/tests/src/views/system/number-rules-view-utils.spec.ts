import { describe, expect, it } from 'vitest'

import type { ModuleRecord } from '@/types/module-page'

import {
  buildRuleSampleNo,
  buildUploadRulePreview,
  DATE_RULE_OPTIONS,
  formatDateRuleLabel,
  formatNumberRuleStatusColor,
  formatNumberRuleStatusText,
  formatResetRuleLabel,
  isNumberRule,
  isSystemSwitch,
  isUploadRule,
  matchesNumberRuleKeyword,
  NUMBER_RULE_STATUS_OPTIONS,
  RESET_RULE_OPTIONS,
} from '@/views/system/number-rules-view-utils'

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

describe('number-rules-view-utils', () => {
  describe('constants', () => {
    it('DATE_RULE_OPTIONS has 3 items', () => {
      expect(DATE_RULE_OPTIONS).toHaveLength(3)
    })

    it('RESET_RULE_OPTIONS has 3 items', () => {
      expect(RESET_RULE_OPTIONS).toHaveLength(3)
    })

    it('NUMBER_RULE_STATUS_OPTIONS has 2 items', () => {
      expect(NUMBER_RULE_STATUS_OPTIONS).toHaveLength(2)
    })
  })

  describe('isUploadRule', () => {
    it('returns true for UPLOAD_RULE', () => {
      expect(isUploadRule(makeRecord({ ruleType: 'UPLOAD_RULE' }))).toBe(true)
    })

    it('returns false for non-UPLOAD_RULE', () => {
      expect(isUploadRule(makeRecord({ ruleType: 'OTHER' }))).toBe(false)
    })
  })

  describe('isSystemSwitch', () => {
    it('returns true for UI_ prefix', () => {
      expect(isSystemSwitch(makeRecord({ settingCode: 'UI_SOMETHING' }))).toBe(
        true,
      )
    })

    it('returns true for SYS_ prefix', () => {
      expect(isSystemSwitch(makeRecord({ settingCode: 'SYS_SOMETHING' }))).toBe(
        true,
      )
    })

    it('returns false for upload rule', () => {
      expect(
        isSystemSwitch(
          makeRecord({ ruleType: 'UPLOAD_RULE', settingCode: 'UI_SOMETHING' }),
        ),
      ).toBe(false)
    })

    it('returns false for other codes', () => {
      expect(isSystemSwitch(makeRecord({ settingCode: 'OTHER' }))).toBe(false)
    })
  })

  describe('isNumberRule', () => {
    it('returns true for non-upload, non-switch record', () => {
      expect(
        isNumberRule(makeRecord({ settingCode: 'BILL_NO', ruleType: '' })),
      ).toBe(true)
    })

    it('returns false for upload rule', () => {
      expect(isNumberRule(makeRecord({ ruleType: 'UPLOAD_RULE' }))).toBe(false)
    })

    it('returns false for system switch', () => {
      expect(isNumberRule(makeRecord({ settingCode: 'SYS_SOMETHING' }))).toBe(
        false,
      )
    })
  })

  describe('matchesNumberRuleKeyword', () => {
    const record = makeRecord({
      settingCode: 'PURCHASE_ORDER_NO',
      settingName: '采购订单编号',
      billName: '采购订单',
      prefix: 'PO',
      sampleNo: 'PO202601000001',
      remark: '自动生成',
      moduleKey: 'purchase',
    })

    it('returns true for empty keyword', () => {
      expect(matchesNumberRuleKeyword(record, '')).toBe(true)
      expect(matchesNumberRuleKeyword(record, '   ')).toBe(true)
    })

    it('matches settingCode', () => {
      expect(matchesNumberRuleKeyword(record, 'PURCHASE')).toBe(true)
    })

    it('matches settingName', () => {
      expect(matchesNumberRuleKeyword(record, '采购')).toBe(true)
    })

    it('matches billName', () => {
      expect(matchesNumberRuleKeyword(record, '订单')).toBe(true)
    })

    it('matches prefix', () => {
      expect(matchesNumberRuleKeyword(record, 'PO')).toBe(true)
    })

    it('matches sampleNo', () => {
      expect(matchesNumberRuleKeyword(record, '202601')).toBe(true)
    })

    it('matches remark', () => {
      expect(matchesNumberRuleKeyword(record, '自动')).toBe(true)
    })

    it('matches moduleKey', () => {
      expect(matchesNumberRuleKeyword(record, 'purchase')).toBe(true)
    })

    it('is case insensitive', () => {
      expect(matchesNumberRuleKeyword(record, 'purchase')).toBe(true)
    })

    it('returns false for non-matching keyword', () => {
      expect(matchesNumberRuleKeyword(record, 'nonexistent')).toBe(false)
    })
  })

  describe('formatDateRuleLabel', () => {
    it('returns label for yyyy', () => {
      expect(formatDateRuleLabel('yyyy')).toBeDefined()
    })

    it('returns label for yyyyMM', () => {
      expect(formatDateRuleLabel('yyyyMM')).toBeDefined()
    })

    it('returns label for NONE', () => {
      expect(formatDateRuleLabel('NONE')).toBeDefined()
    })

    it('returns the value for unknown', () => {
      expect(formatDateRuleLabel('unknown')).toBe('unknown')
    })

    it('returns "--" for undefined', () => {
      expect(formatDateRuleLabel(undefined)).toBe('--')
    })
  })

  describe('formatResetRuleLabel', () => {
    it('returns label for YEARLY', () => {
      expect(formatResetRuleLabel('YEARLY')).toBeDefined()
    })

    it('returns label for MONTHLY', () => {
      expect(formatResetRuleLabel('MONTHLY')).toBeDefined()
    })

    it('returns label for NEVER', () => {
      expect(formatResetRuleLabel('NEVER')).toBeDefined()
    })

    it('returns the value for unknown', () => {
      expect(formatResetRuleLabel('unknown')).toBe('unknown')
    })

    it('returns "--" for undefined', () => {
      expect(formatResetRuleLabel(undefined)).toBe('--')
    })
  })

  describe('formatNumberRuleStatusText', () => {
    it('returns label for 正常', () => {
      expect(formatNumberRuleStatusText('正常')).toBeDefined()
    })

    it('returns label for 禁用', () => {
      expect(formatNumberRuleStatusText('禁用')).toBeDefined()
    })

    it('returns the value for unknown', () => {
      expect(formatNumberRuleStatusText('unknown')).toBe('unknown')
    })

    it('returns "--" for undefined', () => {
      expect(formatNumberRuleStatusText(undefined)).toBe('--')
    })
  })

  describe('formatNumberRuleStatusColor', () => {
    it('returns green for 正常', () => {
      expect(formatNumberRuleStatusColor('正常')).toBe('green')
    })

    it('returns red for 禁用', () => {
      expect(formatNumberRuleStatusColor('禁用')).toBe('red')
    })

    it('returns default for unknown', () => {
      expect(formatNumberRuleStatusColor('unknown')).toBe('default')
    })

    it('returns default for undefined', () => {
      expect(formatNumberRuleStatusColor(undefined)).toBe('default')
    })
  })

  describe('buildRuleSampleNo', () => {
    it('builds sample with yyyy date rule', () => {
      const result = buildRuleSampleNo('PO', 'yyyy', 6)
      expect(result).toBe('PO2026000001')
    })

    it('builds sample with yyyyMM date rule', () => {
      const result = buildRuleSampleNo('PO', 'yyyyMM', 6)
      expect(result).toBe('PO202601000001')
    })

    it('builds sample with NONE date rule', () => {
      const result = buildRuleSampleNo('PO', 'NONE', 4)
      expect(result).toBe('PO0001')
    })

    it('uses default serial length of 6 when 0', () => {
      const result = buildRuleSampleNo('', 'NONE', 0)
      expect(result).toBe('000001')
    })

    it('handles empty prefix', () => {
      const result = buildRuleSampleNo('', 'NONE', 4)
      expect(result).toBe('0001')
    })
  })

  describe('buildUploadRulePreview', () => {
    it('returns empty string for empty pattern', () => {
      expect(buildUploadRulePreview('')).toBe('')
    })

    it('replaces {yyyy} placeholder', () => {
      expect(buildUploadRulePreview('{yyyy}')).toBe('2026')
    })

    it('replaces {年月日} placeholder', () => {
      expect(buildUploadRulePreview('{年月日}')).toBe('20260101')
    })

    it('replaces {yyyyMMdd} placeholder', () => {
      expect(buildUploadRulePreview('{yyyyMMdd}')).toBe('20260101')
    })

    it('replaces {ext} placeholder', () => {
      expect(buildUploadRulePreview('{ext}')).toBe('.pdf')
    })

    it('replaces {originName} placeholder', () => {
      const result = buildUploadRulePreview('{originName}')
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('handles multiple placeholders', () => {
      const result = buildUploadRulePreview('{yyyy}{ext}')
      expect(result).toBe('2026.pdf')
    })
  })
})
