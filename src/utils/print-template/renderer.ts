import { parseLodopScript } from '@/utils/lodop-script'
import { expandEachBlocks, expandIfBlocks, renderPlaceholders } from './syntax'
import type { PrintDataRow, RenderResult } from './types'

function renderCoordTemplate(
  templateHtml: string,
  data: PrintDataRow,
  items: PrintDataRow[],
): string {
  let source = templateHtml
  source = expandEachBlocks(source, items, data, 'lodop')
  source = expandIfBlocks(source, data)
  return renderPlaceholders(source, data, 'lodop')
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
  const script = renderCoordTemplate(templateHtml, data, items)
  parseLodopScript(script)
  return {
    type: 'COORD',
    script,
  }
}
