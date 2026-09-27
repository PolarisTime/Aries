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
import { isPrintTemplateTarget } from '@/config/print-template-targets'
import type { PrintActionMode, PrintTemplateRecord } from '@/shared/schemas'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { downloadBlob } from '@/utils/download'
import { supportsSalesOrderPrintOption } from '@/utils/print-module-config'
import { runPrintOutputs } from '@/utils/print-output-runner'
import { pickDefaultPrintTemplate } from '@/utils/print-template'
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
  splitPieceCount?: number
  /** 逐行勾选拆分的明细 ID；空数组表示没有任何行需要拆分。 */
  splitItemIds?: string[]
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
  if (!isPrintTemplateTarget(moduleKey)) return null
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
    let selectedId = pickDefaultPrintTemplate(templates)?.id ?? templates[0].id

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

  /**
   * 「导出选中 N 条」。
   *
   * <p>后端通用导出接口是 <code>POST {module}/export</code>，只接受模块级筛选参数
   * （nativeFilterKeys 白名单里没有任何 id 集合参数），无法按勾选 id 过滤；因此这里改用
   * 已有的打印导出资源逐条渲染选中记录：<code>renderPrintRecord</code> 的 recordId 就是
   * 选中行 id，一次请求对应一条勾选记录，再统一走 download 输出。导出目标严格等于勾选集合，
   * 不回退导出整页数据。</p>
   *
   * <p>模块不在打印模板白名单、未配置模板或模板没有可下载内容时给出明确提示并返回 false。</p>
   */
  const handleExportSelectedRecords = async (
    printOptions?: PrintRenderOptions,
  ) => {
    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return false
    }

    if (!isPrintTemplateTarget(moduleKey)) {
      message.warning(t('hooks.printActions.exportSelectedUnsupported'))
      return false
    }

    // 勾选集可能包含重复 key（跨页保留选择），去重后每条记录只导出一次
    const recordIds = [...new Set(selectedRowKeys.map((key) => String(key)))]
    const selectedRecord = selectedRows.find((row) =>
      recordIds.includes(String(row.id)),
    )
    const template = await pickPrintTemplate(moduleKey, t, selectedRecord)
    if (!template) {
      message.warning(t('hooks.printActions.noPrintTemplateConfigured'))
      return false
    }

    try {
      const results = await Promise.all(
        recordIds.map((recordId) =>
          renderPrintRecord(template.id, moduleKey, recordId, printOptions),
        ),
      )
      const runResult = await runPrintOutputs(results, {
        fallbackTemplateName: template.templateName,
        mode: 'download',
        printServiceUnavailableMessage: t(
          'hooks.printActions.printServiceUnavailable',
        ),
      })

      if (runResult.pdfCount) {
        return true
      }

      message.warning(t('hooks.printActions.noPrintContent'))
      return false
    } catch (err) {
      message.error(
        await normalizePdfError(
          err,
          t('hooks.printActions.exportSelectedFailed'),
        ),
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

  return {
    handlePrintSelectedRecords,
    handleExportSalesOrderPrintXlsx,
    handleExportSelectedRecords,
  }
}
