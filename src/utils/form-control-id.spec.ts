import { describe, expect, it } from 'vitest'
import { buildFormControlId } from './form-control-id'

describe('buildFormControlId', () => {
  it('joins normalized prefix and key with hyphen', () => {
    expect(buildFormControlId('User', 'Name')).toBe('user-name')
  })

  it('normalizes prefix to lowercase', () => {
    expect(buildFormControlId('USER', 'name')).toBe('user-name')
  })

  it('normalizes key to lowercase', () => {
    expect(buildFormControlId('user', 'NAME')).toBe('user-name')
  })

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(buildFormControlId('user@name', 'first#name')).toBe('user-name-first-name')
  })

  it('removes leading and trailing hyphens', () => {
    expect(buildFormControlId('--user--', '--name--')).toBe('user-name')
  })

  it('trims whitespace', () => {
    expect(buildFormControlId('  user  ', '  name  ')).toBe('user-name')
  })

  it('handles empty prefix', () => {
    expect(buildFormControlId('', 'name')).toBe('name')
  })

  it('handles empty key', () => {
    expect(buildFormControlId('user', '')).toBe('user')
  })

  it('handles both empty', () => {
    expect(buildFormControlId('', '')).toBe('')
  })

  it('handles multiple consecutive non-alphanumeric characters', () => {
    expect(buildFormControlId('user@@@', '###name')).toBe('user-name')
  })

  it('preserves numbers', () => {
    expect(buildFormControlId('user1', 'name2')).toBe('user1-name2')
  })
})