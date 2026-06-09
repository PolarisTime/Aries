import { expandEachBlocks, expandIfBlocks, renderPlaceholders } from './syntax'
import type { PrintDataRow, RenderResult } from './types'

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
  if (templateType !== 'COORD') {
    throw new Error('Unsupported print template type')
  }
  return {
    type: 'COORD',
    script: renderCoordTemplate(templateHtml, data, items),
  }
}
