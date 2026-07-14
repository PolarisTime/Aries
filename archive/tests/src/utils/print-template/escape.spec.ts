import { describe, expect, it } from 'vitest'
import { escapeJs } from './escape'

describe('escapeJs', () => {
  it('returns empty string for empty input', () => {
    expect(escapeJs('')).toBe('')
    expect(escapeJs(null as unknown as string)).toBe('')
    expect(escapeJs(undefined as unknown as string)).toBe('')
  })

  it('escapes double quotes', () => {
    expect(escapeJs('he"llo')).toBe('he\\"llo')
  })

  it('escapes single quotes', () => {
    expect(escapeJs("he'llo")).toBe("he\\'llo")
  })

  it('escapes backslash', () => {
    expect(escapeJs('he\\llo')).toBe('he\\\\llo')
  })

  it('escapes newline', () => {
    expect(escapeJs('he\nllo')).toBe('he\\nllo')
  })

  it('escapes carriage return', () => {
    expect(escapeJs('he\rllo')).toBe('he\\rllo')
  })

  it('escapes tab', () => {
    expect(escapeJs('he\tllo')).toBe('he\\tllo')
  })

  it('escapes less-than', () => {
    expect(escapeJs('he<llo')).toBe('he\\x3cllo')
  })

  it('escapes greater-than', () => {
    expect(escapeJs('he>llo')).toBe('he\\x3ello')
  })

  it('escapes control characters (below 0x20)', () => {
    expect(escapeJs('he\x00llo')).toBe('he\\x00llo')
    expect(escapeJs('he\x01llo')).toBe('he\\x01llo')
    expect(escapeJs('he\x1fllo')).toBe('he\\x1fllo')
  })

  it('preserves normal characters', () => {
    expect(escapeJs('hello')).toBe('hello')
    expect(escapeJs('Hello World 123')).toBe('Hello World 123')
  })

  it('escapes mixed special characters', () => {
    const input = 'a"b\'c\\d\ne\rf\tg<h>i\x01j'
    const expected = 'a\\"b\\\'c\\\\d\\ne\\rf\\tg\\x3ch\\x3ei\\x01j'
    expect(escapeJs(input)).toBe(expected)
  })
})
