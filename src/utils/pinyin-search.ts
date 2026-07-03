import { pinyin } from 'pinyin-pro'

/**
 * 为中文文本生成拼音搜索 token：
 * - 全拼字符串（如 "益海" → "yihai"）
 * - 首字母字符串（如 "益海" → "yh"）
 *
 * 用户输入 "yh" 即可匹配 "益海"，输入 "yi" 或 "yihai" 也能匹配。
 */
export function buildPinyinSearchTokens(value: string): string[] {
  if (!value) {
    return []
  }
  const tokens = pinyin(value, { toneType: 'none', type: 'array' }).flatMap(
    (token) => {
      const normalizedToken = String(token || '')
        .trim()
        .toLowerCase()
      return normalizedToken ? [normalizedToken] : []
    },
  )
  if (tokens.length === 0) {
    return []
  }
  return [tokens.join(''), tokens.map((token) => token.charAt(0)).join('')]
}

/**
 * Ant Design Select/AutoComplete 的 filterOption 工厂函数。
 * 支持：
 * - 中文原文匹配
 * - 拼音全拼匹配（"yihai"）
 * - 拼音首字母匹配（"yh"）
 * - 多关键词空格分隔匹配
 *
 * 用法：
 *   filterOption={createPinyinFilterOption()}
 *   // 或使用 option 自定义 searchText 属性：
 *   filterOption={createPinyinFilterOption('searchText')}
 */
export function createPinyinFilterOption(
  searchTextProp?: string,
): (
  input: string,
  option?: { label?: string; searchText?: string; [key: string]: unknown },
) => boolean {
  return (input: string, option) => {
    if (!input) return true
    const keywords = input.trim().toLowerCase().split(/\s+/)

    const label = String(option?.label || '')
    const customSearchText = searchTextProp
      ? String(option?.[searchTextProp] || '')
      : ''

    // 构建搜索文本：label + 自定义 searchText + 拼音 tokens
    const tokens = [label, customSearchText, ...buildPinyinSearchTokens(label)]
    const searchText = tokens.filter(Boolean).join(' ').toLowerCase()

    return keywords.every((kw) => searchText.includes(kw))
  }
}
