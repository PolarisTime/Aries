import axios from 'axios'
import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import {
  exportSalesOrderPrintXlsx,
  listPrintTemplates,
  renderPrintRecord,
  type SalesOrderPrintXlsxOptions,
} from '@/api/system/print-template'
import { PrintTemplateSelector } from '@/components/PrintTemplateSelector'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { downloadBlob } from '@/utils/download'
import { supportsSalesOrderPrintOption } from '@/utils/print-module-config'
import { runPrintOutputs } from '@/utils/print-output-runner'
import { filterPrintTemplatesBySettlementCompany } from '@/utils/print-template-settlement'

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
  selectedRows?: ModuleRecord[]
}

export interface PrintRenderOptions {
  hideUnitPrice?: boolean
  hideRemark?: boolean
  mergeEquivalentItems?: boolean
  brandOverride?: string
  brandOverrides?: Record<string, string>
  brandOverridesByItemId?: Record<string, string>
  itemOrder?: string[]
  selectedItemIds?: string[]
}

function normalizeXlsxFileName(value: unknown) {
  const text = value == null ? '' : String(value).trim()
  const baseName = text || 'sales-order-print'
  const safeName = baseName.replace(/[\\/:*?"<>|]/g, '_')
  return safeName.toLowerCase().endsWith('.xlsx')
    ? safeName
    : `${safeName}.xlsx`
}

function extractErrorMessage(value: unknown) {
  if (!value || typeof value !== 'object' || !('message' in value)) {
    return undefined
  }
  const { message } = value
  return typeof message === 'string' && message.trim() ? message : undefined
}

async function normalizePdfError(err: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(err)) {
    return err instanceof Error ? err.message : fallbackMessage
  }

  const data = err.response?.data
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const message = extractErrorMessage(JSON.parse(text))
      if (message) return message
    } catch {
      // fall through to axios message
    }
  }

  return err.message || fallbackMessage
}

async function pickPrintTemplate(
  moduleKey: string,
  t: (key: string) => string,
  selectedRecord?: ModuleRecord,
): Promise<PrintTemplateRecord | null> {
  if (!Object.hasOwn(printTemplateTargetMap, moduleKey)) return null
  const templatesResponse = await listPrintTemplates(moduleKey)
  const templates = filterPrintTemplatesBySettlementCompany(
    templatesResponse.filter(
      (t) =>
        (t.status == null || t.status === 'ACTIVE') &&
        (t.templateType === 'COORD' || t.templateType === 'PDF_FORM') &&
        (t.templateType === 'PDF_FORM' || t.templateHtml?.trim()),
    ),
    selectedRecord,
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
    printOptions?: SalesOrderPrintXlsxOptions,
  ) => {
    if (!supportsSalesOrderPrintOption(moduleKey)) return false

    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return false
    }

    if (selectedRowKeys.length > 1) {
      message.warning(t('hooks.printActions.singleRecordOnly'))
      return false
    }

    try {
      const recordId = selectedRowKeys[0]
      const download = await exportSalesOrderPrintXlsx(
        recordId,
        printOptions ? { printOptions } : {},
      )
      downloadBlob(
        download.blob,
        normalizeXlsxFileName(download.fileName || recordId),
      )
      return true
    } catch (err) {
      message.error(
        await normalizePdfError(err, t('hooks.printActions.exportXlsxFailed')),
      )
      return false
    }
  }

  const handlePrintSelectedRecords = async (
    mode: PrintActionMode,
    selectedTemplate?: PrintTemplateRecord,
    printOptions?: PrintRenderOptions,
  ) => {
    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return false
    }

    if (selectedRowKeys.length > 1) {
      message.warning(t('hooks.printActions.singleRecordOnly'))
      return false
    }

    const selectedRecord = selectedRows.find(
      (row) => String(row.id) === selectedRowKeys[0],
    )
    const template =
      selectedTemplate ||
      (await pickPrintTemplate(moduleKey, t, selectedRecord))

    if (!template) {
      message.warning(t('hooks.printActions.noPrintTemplateConfigured'))
      return false
    }

    try {
      const results = await Promise.all(
        selectedRowKeys.map((recordId) =>
          renderPrintRecord(template.id, moduleKey, recordId, printOptions),
        ),
      )
      const runResult = await runPrintOutputs(results, {
        fallbackTemplateName: template.templateName,
        mode,
        printServiceUnavailableMessage: t(
          'hooks.printActions.printServiceUnavailable',
        ),
      })

      if (mode === 'download' && runResult.pdfCount) {
        return true
      }

      if (mode === 'download') {
        message.warning(t('hooks.printActions.noPrintContent'))
        return false
      }

      if (!runResult.pdfCount && !runResult.coordCount) {
        message.warning(t('hooks.printActions.noPrintContent'))
        return false
      }
      return true
    } catch (err) {
      message.error(
        await normalizePdfError(err, t('hooks.printActions.printFailed')),
      )
      return false
    }
  }

  return { handlePrintSelectedRecords, handleExportSalesOrderPrintXlsx }
}
