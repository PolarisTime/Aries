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
/**
 * 结构化商品搜索选项字段：数字词与文本词分别匹配不同字段，
 * 避免拼接子串匹配带来的跨字段误配（如规格 12 命中长度“12米”）。
 */
export interface StructuredMaterialOption {
  code?: unknown
  brand?: unknown
  material?: unknown
  category?: unknown
  spec?: unknown
  length?: unknown
}

/** 编码前缀匹配所需的最小数字位数，避免短数字词随机命中雪花 ID。 */
const MATERIAL_CODE_MIN_PREFIX_LENGTH = 6

function asSearchText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function matchStructuredKeyword(
  keyword: string,
  option: StructuredMaterialOption,
): boolean {
  const code = asSearchText(option.code)
  const brand = asSearchText(option.brand)
  const material = asSearchText(option.material)
  const category = asSearchText(option.category)
  const spec = asSearchText(option.spec)
  const length = asSearchText(option.length)

  if (/^\d+$/.test(keyword)) {
    // 纯数字词：规格整值优先，其次材质码子串；长数字串按编码前缀找货。
    if (spec === keyword) return true
    if (material.includes(keyword)) return true
    return (
      keyword.length >= MATERIAL_CODE_MIN_PREFIX_LENGTH &&
      code.startsWith(keyword)
    )
  }

  // 文本词：品牌/材质/类别/长度子串 + 品牌拼音（全拼、首字母）。
  const haystack = [
    brand,
    material,
    category,
    length,
    ...buildPinyinSearchTokens(brand),
  ]
    .filter(Boolean)
    .join(' ')
  return haystack.includes(keyword)
}

/**
 * 商品选择下拉的结构化过滤工厂：
 * - 纯数字词 → 规格整值 / 材质码子串 / ≥6 位编码前缀
 * - 文本词 → 品牌、材质、类别、长度子串 + 品牌拼音
 * - 多词 AND，每个词独立选择命中的字段
 */
export function createStructuredMaterialFilterOption(): (
  input: string,
  option?: StructuredMaterialOption,
) => boolean {
  return (input, option) => {
    if (!input) return true
    const keywords = input.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (keywords.length === 0) return true
    if (!option) return false
    return keywords.every((keyword) => matchStructuredKeyword(keyword, option))
  }
}

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
