import { describe, expect, it } from 'vitest'
import { buildLabeledFormItemProps } from './form-control-a11y'

describe('buildLabeledFormItemProps', () => {
  it('returns label and htmlFor', () => {
    const result = buildLabeledFormItemProps({
      label: 'Username',
      htmlFor: 'username-input',
    })
    expect(result).toEqual({
      label: 'Username',
      htmlFor: 'username-input',
    })
  })

  it('handles ReactNode label', () => {
    const label = 'Username'
    const result = buildLabeledFormItemProps({
      label,
      htmlFor: 'username-input',
    })
    expect(result.label).toBe(label)
    expect(result.htmlFor).toBe('username-input')
  })

  it('handles empty string label', () => {
    const result = buildLabeledFormItemProps({
      label: '',
      htmlFor: 'test',
    })
    expect(result.label).toBe('')
    expect(result.htmlFor).toBe('test')
  })

  it('handles empty string htmlFor', () => {
    const result = buildLabeledFormItemProps({
      label: 'Test',
      htmlFor: '',
    })
    expect(result.label).toBe('Test')
    expect(result.htmlFor).toBe('')
  })
})
