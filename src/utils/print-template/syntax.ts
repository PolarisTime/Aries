import { escapeJs } from './escape'
import type { PrintDataRow } from './types'

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

const EACH_BLOCK_RE = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
const IF_BLOCK_RE =
  /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g

type PlaceholderMode = 'lodop' | 'text'

function isTruthyTemplateValue(value: string | undefined): boolean {
  return Boolean(value && value !== 'false' && value !== '0')
}

function mergedRow(row: PrintDataRow, data: PrintDataRow): PrintDataRow {
  return { ...data, ...row }
}

function isInsideStringLiteral(source: string, offset: number): boolean {
  let escaped = false
  let quote = ''
  for (let index = 0; index < offset; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
    } else if (char === '"' || char === "'") {
      quote = char
    }
  }
  return Boolean(quote)
}

function renderPlaceholderValue(
  source: string,
  offset: number,
  value: string,
  mode: PlaceholderMode,
): string {
  if (mode === 'text' || isInsideStringLiteral(source, offset)) {
    return escapeJs(value)
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) return ''
  const numericValue = Number(normalizedValue)
  if (!Number.isFinite(numericValue)) {
    throw new Error('Invalid numeric print template value')
  }
  return String(numericValue)
}

function replacePlaceholders(
  source: string,
  data: PrintDataRow,
  mode: PlaceholderMode,
): string {
  return source.replace(PLACEHOLDER_RE, (_match, key: string, offset: number) =>
    renderPlaceholderValue(source, offset, data[key] ?? '', mode),
  )
}

function expandIfBlocksForRow(
  source: string,
  row: PrintDataRow,
  data: PrintDataRow,
): string {
  const context = mergedRow(row, data)
  return source.replace(
    IF_BLOCK_RE,
    (_match, field: string, truthyInner: string, falsyInner: string = '') =>
      isTruthyTemplateValue(context[field]) ? truthyInner : falsyInner,
  )
}

export function expandEachBlocks(
  source: string,
  items: PrintDataRow[],
  data: PrintDataRow = {},
  mode: PlaceholderMode = 'text',
): string {
  return source.replace(
    EACH_BLOCK_RE,
    (_match, _field: string, inner: string) =>
      items
        .map((item) => {
          const context = mergedRow(item, data)
          return replacePlaceholders(
            expandIfBlocksForRow(inner, item, data),
            context,
            mode,
          )
        })
        .join(''),
  )
}

export function expandIfBlocks(source: string, data: PrintDataRow): string {
  return source.replace(
    IF_BLOCK_RE,
    (_match, field: string, truthyInner: string, falsyInner: string = '') =>
      isTruthyTemplateValue(data[field]) ? truthyInner : falsyInner,
  )
}

export function renderPlaceholders(
  source: string,
  data: PrintDataRow,
  mode: PlaceholderMode = 'text',
): string {
  return replacePlaceholders(source, data, mode)
}
