import { escapeJs } from './escape'
import type { PrintDataRow } from './types'

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

const EACH_BLOCK_RE = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
const IF_BLOCK_RE =
  /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g

function isTruthyTemplateValue(value: string | undefined): boolean {
  return Boolean(value && value !== 'false' && value !== '0')
}

function mergedRow(row: PrintDataRow, data: PrintDataRow): PrintDataRow {
  return { ...data, ...row }
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
): string {
  return source.replace(
    EACH_BLOCK_RE,
    (_match, _field: string, inner: string) =>
      items
        .map((item) => {
          const context = mergedRow(item, data)
          return expandIfBlocksForRow(inner, item, data).replace(
            PLACEHOLDER_RE,
            (_m, key: string) => escapeJs(context[key] || ''),
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

export function renderPlaceholders(source: string, data: PrintDataRow): string {
  return source.replace(PLACEHOLDER_RE, (_match, key: string) =>
    escapeJs(data[key] || ''),
  )
}
