import type { PrintActionMode } from '@/types/print-template'
import { execPrintCode, loadCLodop } from '@/utils/clodop'
import { downloadBlob } from '@/utils/download'
import { renderPrintTemplate } from '@/utils/print-template'

interface BasePrintOutputResponse {
  templateName?: string
  templateType?: string
  data?: Record<string, string>
  items?: Record<string, string>[]
}

export interface PdfPrintOutputResponse extends BasePrintOutputResponse {
  kind: 'PDF'
  contentType?: string
  fileName?: string
  pdfBase64: string
}

export interface LodopScriptPrintOutputResponse
  extends BasePrintOutputResponse {
  kind: 'LODOP_SCRIPT'
  templateHtml: string
}

export type PrintOutputResponse =
  | PdfPrintOutputResponse
  | LodopScriptPrintOutputResponse

interface RunPrintOutputsOptions {
  fallbackTemplateName: string
  mode: PrintActionMode
  printServiceUnavailableMessage: string
}

export interface RunPrintOutputsResult {
  coordCount: number
  pdfCount: number
}

function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function blobFromBase64(base64: string, contentType = 'application/pdf') {
  const binary = window.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}

function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const frame = document.createElement('iframe')
  frame.src = url
  frame.style.position = 'fixed'
  frame.style.right = '0'
  frame.style.bottom = '0'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  frame.addEventListener(
    'load',
    () => {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    },
    { once: true },
  )
  document.body.appendChild(frame)
  window.setTimeout(() => {
    frame.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
}

function handlePdfBlob(blob: Blob, mode: PrintActionMode, fileName: string) {
  if (mode === 'preview') {
    openPdfBlob(blob)
    return
  }
  if (mode === 'download') {
    downloadBlob(blob, fileName)
    return
  }
  printPdfBlob(blob)
}

function normalizePdfFileName(fileName: string) {
  const normalized = fileName.trim() || 'print.pdf'
  return normalized.toLowerCase().endsWith('.pdf')
    ? normalized
    : `${normalized}.pdf`
}

function requirePrintService(success: boolean, message: string) {
  if (!success) {
    throw new Error(message)
  }
}

function isPdfOutput(
  output: PrintOutputResponse,
): output is PdfPrintOutputResponse {
  return output.kind === 'PDF'
}

function isCoordOutput(
  output: PrintOutputResponse,
): output is LodopScriptPrintOutputResponse {
  return output.kind === 'LODOP_SCRIPT'
}

export async function runPrintOutputs(
  outputs: PrintOutputResponse[],
  options: RunPrintOutputsOptions,
): Promise<RunPrintOutputsResult> {
  const pdfOutputs = outputs.filter(isPdfOutput)
  for (const output of pdfOutputs) {
    handlePdfBlob(
      blobFromBase64(output.pdfBase64, output.contentType),
      options.mode,
      normalizePdfFileName(
        output.fileName || output.templateName || options.fallbackTemplateName,
      ),
    )
  }

  if (options.mode === 'download') {
    return { coordCount: 0, pdfCount: pdfOutputs.length }
  }

  const coordOutputs = outputs
    .filter(isCoordOutput)
    .map((output) => {
      return {
        title: output.templateName || options.fallbackTemplateName,
        result: renderPrintTemplate(
          output.templateHtml,
          output.templateType || 'COORD',
          output.data || {},
          output.items || [],
        ),
      }
    })
    .filter((output) => output.result.type === 'COORD')

  if (coordOutputs.length) {
    await loadCLodop()
  }

  for (const output of coordOutputs) {
    if (!output.result.script) continue
    const success = execPrintCode(output.result.script, {
      preview: options.mode === 'preview',
      title: output.title,
    })
    requirePrintService(success, options.printServiceUnavailableMessage)
  }

  return { coordCount: coordOutputs.length, pdfCount: pdfOutputs.length }
}
