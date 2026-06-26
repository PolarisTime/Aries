import axios from 'axios'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { assertApiSuccess, http } from '@/api/client'
import {
  exportSalesOrderPrintXlsx,
  listPrintTemplates,
} from '@/api/print-template'
import { PrintTemplateSelector } from '@/components/PrintTemplateSelector'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import type { ModuleRecord } from '@/types/module-page'
import type {
  PrintActionMode,
  PrintTemplateRecord,
} from '@/types/print-template'
import { message, modal } from '@/utils/antd-app'
import { execPrintCode, loadCLodop } from '@/utils/clodop'
import { downloadBlob } from '@/utils/download'
import { renderPrintTemplate } from '@/utils/print-template'

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
  selectedRows?: ModuleRecord[]
}

export interface PrintOptions {
  hideUnitPrice?: boolean
  hideRemark?: boolean
  brandOverride?: string
  brandOverrides?: Record<string, string>
  brandOverridesByItemId?: Record<string, string>
  itemOrder?: string[]
}

interface PrintRecordResponse {
  templateName?: string
  templateHtml?: string
  templateType: string
  data?: Record<string, string>
  items?: Record<string, string>[]
  contentType?: string
  fileName?: string
  pdfBase64?: string
}

function requirePrintService(success: boolean, message: string) {
  if (!success) {
    throw new Error(message)
  }
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

function normalizeXlsxFileName(value: unknown) {
  const text = value == null ? '' : String(value).trim()
  const baseName = text || 'sales-order-print'
  const safeName = baseName.replace(/[\\/:*?"<>|]/g, '_')
  return safeName.toLowerCase().endsWith('.xlsx')
    ? safeName
    : `${safeName}.xlsx`
}

async function normalizePdfError(err: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallbackMessage
  }

  const data = err.response?.data
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed.message) return parsed.message
    } catch {
      // fall through to axios message
    }
  }

  return err.message || fallbackMessage
}

async function pickPrintTemplate(
  moduleKey: string,
  t: (key: string) => string,
): Promise<PrintTemplateRecord | null> {
  if (!Object.hasOwn(printTemplateTargetMap, moduleKey)) return null
  const response = await listPrintTemplates(moduleKey)
  const templates = (response?.data || []).filter(
    (t) =>
      (t.status == null || t.status === 'ACTIVE') &&
      (t.templateType === 'COORD' || t.templateType === 'PDF_FORM') &&
      (t.templateType === 'PDF_FORM' || t.templateHtml?.trim()),
  )

  if (templates.length === 0) return null
  if (templates.length === 1) return templates[0]

  return new Promise<PrintTemplateRecord | null>((resolve) => {
    let selectedId = templates[0].id

    modal.confirm({
      title: t('hooks.printActions.selectPrintTemplate'),
      width: 480,
      icon: null,
      okText: t('common.ok'),
      cancelText: t('common.cancel'),
      content: createElement(PrintTemplateSelector, {
        templates,
        defaultId: selectedId,
        onSelect: (id: string) => {
          selectedId = id
        },
      }),
      onOk: () => {
        resolve(templates.find((t) => t.id === selectedId) || null)
      },
      onCancel: () => {
        resolve(null)
      },
    })
  })
}

export function useBusinessGridPrintActions({
  moduleKey,
  selectedRowKeys,
  selectedRows = [],
}: Props) {
  const { t } = useTranslation()

  const handleExportSalesOrderPrintXlsx = async (
    printOptions?: PrintOptions,
  ) => {
    if (moduleKey !== 'sales-order') return

    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return
    }

    if (selectedRowKeys.length > 1) {
      message.warning(t('hooks.printActions.singleRecordOnly'))
      return
    }

    try {
      const recordId = selectedRowKeys[0]
      const blob = await exportSalesOrderPrintXlsx(recordId, printOptions)
      const selectedRow = selectedRows.find(
        (row) => String(row.id) === recordId,
      )
      downloadBlob(
        blob,
        normalizeXlsxFileName(selectedRow?.orderNo || recordId),
      )
    } catch (err) {
      message.error(
        await normalizePdfError(err, t('hooks.printActions.exportXlsxFailed')),
      )
    }
  }

  const handlePrintSelectedRecords = async (
    mode: PrintActionMode,
    selectedTemplate?: PrintTemplateRecord,
    printOptions?: PrintOptions,
  ) => {
    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return
    }

    if (selectedRowKeys.length > 1) {
      message.warning(t('hooks.printActions.singleRecordOnly'))
      return
    }

    const template = selectedTemplate || (await pickPrintTemplate(moduleKey, t))

    if (!template) {
      message.warning(t('hooks.printActions.noPrintTemplateConfigured'))
      return
    }

    try {
      const results = await Promise.all(
        selectedRowKeys.map((recordId) =>
          http.post<{
            code: number
            data: PrintRecordResponse
            message?: string
          }>('/print/record', {
            templateId: template.id,
            moduleKey,
            recordId,
            ...(printOptions ? { printOptions } : {}),
          }),
        ),
      )
      for (const r of results) {
        assertApiSuccess(r, t('hooks.printActions.printScriptGenerationFailed'))
      }

      const pdfResults = results
        .map((r) => r.data)
        .filter(
          (d): d is PrintRecordResponse =>
            d?.templateType === 'PDF_FORM' && Boolean(d.pdfBase64),
        )
      for (const d of pdfResults) {
        handlePdfBlob(
          blobFromBase64(d.pdfBase64 || '', d.contentType),
          mode,
          normalizePdfFileName(
            d.fileName || d.templateName || template.templateName,
          ),
        )
      }

      if (mode === 'download' && pdfResults.length) {
        return
      }

      if (mode === 'download') {
        message.warning(t('hooks.printActions.noPrintContent'))
        return
      }

      const rendered = results
        .map((r) => {
          const d = r.data
          if (d?.templateType === 'PDF_FORM') return null
          if (!d?.templateHtml) return null
          return {
            title: d.templateName || template.templateName,
            result: renderPrintTemplate(
              d.templateHtml,
              d.templateType || 'COORD',
              d.data || {},
              d.items || [],
            ),
          }
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r))

      const coordResults = rendered.filter((r) => r.result.type === 'COORD')

      if (coordResults.length) {
        // 确保 CLodop 脚本已加载（main.tsx 预加载 + 此处兜底）
        await loadCLodop()
      }

      for (const r of coordResults) {
        if (!r.result.script) continue
        const success = execPrintCode(r.result.script, {
          preview: mode === 'preview',
          title: r.title,
        })
        requirePrintService(
          success,
          t('hooks.printActions.printServiceUnavailable'),
        )
      }

      if (!pdfResults.length && !coordResults.length) {
        message.warning(t('hooks.printActions.noPrintContent'))
      }
    } catch (err) {
      message.error(
        await normalizePdfError(err, t('hooks.printActions.printFailed')),
      )
    }
  }

  return { handlePrintSelectedRecords, handleExportSalesOrderPrintXlsx }
}
