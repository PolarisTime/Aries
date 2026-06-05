import { escapeJs } from './escape'
import { expandEachBlocks, expandIfBlocks, renderPlaceholders } from './syntax'
import type { PrintDataRow, RenderResult } from './types'

const DETAIL_BLOCK_RE =
  /<!--DETAIL_ROW_START-->([\s\S]*?)<!--DETAIL_ROW_END-->/g
const DETAIL_PLACEHOLDER_RE = /\{\{detail\.(\w+)\}\}/g

function renderHtmlTemplate(
  templateHtml: string,
  data: PrintDataRow,
  items: PrintDataRow[],
): string {
  const html = templateHtml.replace(
    DETAIL_BLOCK_RE,
    (_match, rowTemplate: string) =>
      items
        .map((item) =>
          rowTemplate.replace(DETAIL_PLACEHOLDER_RE, (_m, key: string) =>
            escapeJs(item[key] || ''),
          ),
        )
        .join(''),
  )

  return renderPlaceholders(html, data)
}

function renderCoordTemplate(
  templateHtml: string,
  data: PrintDataRow,
  items: PrintDataRow[],
): string {
  let source = templateHtml
  source = expandEachBlocks(source, items)
  source = expandIfBlocks(source, data)
  return renderPlaceholders(source, data)
}

export function renderPrintTemplate(
  templateHtml: string,
  templateType: string,
  data: PrintDataRow,
  items: PrintDataRow[],
): RenderResult {
  if (templateType === 'COORD') {
    return {
      type: 'COORD',
      script: renderCoordTemplate(templateHtml, data, items),
    }
  }

  return {
    type: 'HTML',
    html: renderHtmlTemplate(templateHtml, data, items),
  }
}
