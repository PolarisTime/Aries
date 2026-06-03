import { describe, expect, it } from 'vitest'
import { padLabel } from './label-utils'

describe('padLabel', () => {
  it('pads label with fullwidth spaces to reach target CJK count', () => {
    const result = padLabel('测试', 4)
    expect(result).toBe('　　测试')
  })

  it('returns original text if CJK count already meets target', () => {
    const result = padLabel('测试文本', 4)
    expect(result).toBe('测试文本')
  })

  it('returns original text if CJK count exceeds target', () => {
    const result = padLabel('测试文本内容', 4)
    expect(result).toBe('测试文本内容')
  })

  it('uses default target of 4', () => {
    const result = padLabel('测试')
    expect(result).toBe('　　测试')
  })

  it('handles text with no CJK characters', () => {
    const result = padLabel('test', 4)
    expect(result).toBe('　　　　test')
  })

  it('handles mixed CJK and non-CJK characters', () => {
    const result = padLabel('test测试', 4)
    expect(result).toBe('　　test测试')
  })

  it('handles empty string', () => {
    const result = padLabel('', 4)
    expect(result).toBe('　　　　')
  })

  it('handles custom target', () => {
    const result = padLabel('测试', 6)
    expect(result).toBe('　　　　测试')
  })

  it('handles target of 0', () => {
    const result = padLabel('测试', 0)
    expect(result).toBe('测试')
  })

  it('handles target of 1', () => {
    const result = padLabel('测试', 1)
    expect(result).toBe('测试')
  })
})