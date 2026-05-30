import '@/i18n'
import { describe, expect, it, vi } from 'vitest'
import { buildUploadRulePreview } from '@/views/system/number-rules-view-utils'

describe('buildUploadRulePreview', () => {
  it('renders Chinese upload date placeholders', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1777005045000)

    expect(
      buildUploadRulePreview(
        '{年月日}_{年月日}_{年月日时分秒}_{originName}{ext}_{timestamp}_{random8}',
      ),
    ).toBe('20260101_20260101_20260101120000_原始文件名.pdf_1777005045000_abcd1234')
  })

  it('keeps preview support for legacy date placeholders', () => {
    expect(buildUploadRulePreview('{yyyyMMdd}_{yyyyMMddHHmmss}')).toBe(
      '20260101_20260101120000',
    )
  })
})
