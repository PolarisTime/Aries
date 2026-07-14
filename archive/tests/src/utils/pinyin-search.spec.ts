import { describe, expect, it, vi } from 'vitest'
import {
  buildPinyinSearchTokens,
  createPinyinFilterOption,
} from './pinyin-search'

vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn((value: string) => {
    if (value === '益海') {
      return ['Yi', ' Hai ', '']
    }
    if (value === '空') {
      return ['', '  ']
    }
    return [value]
  }),
}))

describe('buildPinyinSearchTokens', () => {
  it('returns empty tokens for empty input', () => {
    expect(buildPinyinSearchTokens('')).toEqual([])
  })

  it('normalizes full pinyin and initials', () => {
    expect(buildPinyinSearchTokens('益海')).toEqual(['yihai', 'yh'])
  })

  it('returns empty tokens when pinyin output has no searchable text', () => {
    expect(buildPinyinSearchTokens('空')).toEqual([])
  })
})

describe('createPinyinFilterOption', () => {
  it('keeps all options for empty input', () => {
    const filterOption = createPinyinFilterOption()

    expect(filterOption('', { label: '任意' })).toBe(true)
  })

  it('matches original label, pinyin, and initials with multiple keywords', () => {
    const filterOption = createPinyinFilterOption()

    expect(filterOption('益海 yh', { label: '益海' })).toBe(true)
    expect(filterOption('yihai', { label: '益海' })).toBe(true)
    expect(filterOption('missing', { label: '益海' })).toBe(false)
  })

  it('matches custom search text when a search prop is configured', () => {
    const filterOption = createPinyinFilterOption('searchText')

    expect(
      filterOption('customer active', {
        label: '益海',
        searchText: 'customer active',
      }),
    ).toBe(true)
  })

  it('falls back to label tokens when configured custom search text is missing', () => {
    const filterOption = createPinyinFilterOption('searchText')

    expect(filterOption('yh', { label: '益海' })).toBe(true)
    expect(filterOption('customer', { label: '益海' })).toBe(false)
  })

  it('handles missing options as a non-match for non-empty input', () => {
    const filterOption = createPinyinFilterOption()

    expect(filterOption('keyword')).toBe(false)
  })
})
