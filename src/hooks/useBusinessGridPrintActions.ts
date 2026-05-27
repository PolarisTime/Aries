import { createElement, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getBusinessModuleDetail } from '@/api/business'
import { assertApiSuccess, http } from '@/api/client'
import { listPrintTemplates } from '@/api/print-template'
import { PrintTemplateSelector } from '@/components/PrintTemplateSelector'
import type { ModulePageConfig } from '@/types/module-page'
import type { PrintTemplateRecord } from '@/types/print-template'
import { message, modal } from '@/utils/antd-app'
import { execPrintCode, loadCLodop, printHtml } from '@/utils/clodop'
import { buildModulePrintHtml } from '@/utils/module-print'
import { asString } from '@/utils/type-narrowing'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  selectedRowKeys: string[]
  formatCellValue: (value: unknown, columnType?: string) => string
}

async function pickPrintTemplate(
  moduleKey: string,
  t: (key: string) => string,
): Promise<PrintTemplateRecord | null> {
  const response = await listPrintTemplates(moduleKey)
  const templates = (response?.data || []).filter((t) => t.templateHtml?.trim())

  if (templates.length === 0) return null
  if (templates.length === 1) return templates[0]

  return new Promise<PrintTemplateRecord | null>((resolve) => {
    let selectedId = templates[0].id
    const defaultTemplate = templates.find((t) => t.isDefault === '1')
    if (defaultTemplate) selectedId = defaultTemplate.id

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
  config,
  selectedRowKeys,
  formatCellValue,
}: Props) {
  const { t } = useTranslation()
  const handlePrintSelectedRecords = useCallback(
    async (preview: boolean, templateId?: string) => {
      if (!selectedRowKeys.length) {
        message.warning(t('common.pleaseSelect'))
        return
      }

      const template = templateId
        ? { id: templateId, templateName: '', billType: moduleKey, templateHtml: '' }
        : await pickPrintTemplate(moduleKey, t)

      try {
        // 确保 CLodop 脚本已加载（main.tsx 预加载 + 此处兜底）
        await loadCLodop()

        const selectedDetails = await Promise.all(
          selectedRowKeys.map((id) => getBusinessModuleDetail(moduleKey, id)),
        )
        const selectedRecords = selectedDetails.map((detail) => detail.data)

        if (!selectedRecords.length) {
          message.warning(t('hooks.printActions.noPrintableRecords'))
          return
        }

        if (template?.templateHtml?.trim()) {
          // 传 recordId，后端从 DB 加载数据生成脚本/HTML（防前端篡改）
          const results = await Promise.all(
            selectedRecords.map((record) =>
              http.post<{
                code: number
                data: { type: string; script?: string; html?: string }
                message?: string
              }>('/print/record', {
                templateId: template.id,
                moduleKey,
                recordId: record.id,
              }),
            ),
          )
          for (const r of results) {
            assertApiSuccess(r, t('hooks.printActions.printScriptGenerationFailed'))
          }

          // COORD 模板 → execPrintCode; HTML 模板 → printHtml
          const coordResults = results.filter((r) => r.data?.type === 'COORD')
          const htmlResults = results.filter((r) => r.data?.type === 'HTML')

          for (const r of coordResults) {
            const script = r.data?.script
            if (!script) continue
            const success = execPrintCode(script, {
              preview,
              title: template.templateName || config.title,
            })
            if (!success) throw new Error(t('hooks.printActions.printServiceUnavailable'))
          }

          if (htmlResults.length) {
            const htmlContents = htmlResults
              .map((r) => r.data?.html)
              .filter((h): h is string => Boolean(h))
            if (htmlContents.length) {
              const joinedHtml = htmlContents.join('<div class="print-page"></div>')
              const success = printHtml(joinedHtml, {
                preview,
                title: template.templateName || config.title,
              })
              if (!success) throw new Error(t('hooks.printActions.printServiceUnavailable'))
            }
          }

          if (!coordResults.length && !htmlResults.length) {
            message.warning(t('hooks.printActions.noPrintContent'))
          }

          return
        }

        // 无模板：回退到通用 HTML 打印
        const renderedHtml = selectedRecords
          .map((record) => {
            const fields = (config.detailFields || []).map((field) => ({
              label: field.label,
              value: formatCellValue(record[field.key], field.type),
            }))
            const itemColumns = config.itemColumns || []
            const rows = Array.isArray(record.items)
              ? record.items.map((item) =>
                  itemColumns.map((column) =>
                    formatCellValue(item[column.dataIndex], column.type),
                  ),
                )
              : []

            return buildModulePrintHtml({
              title: config.title,
              subtitle: asString(record[config.primaryNoKey || 'id']),
              fields,
              columns: itemColumns.map((column) => ({
                title: column.title,
                align: column.align || 'left',
              })),
              rows,
            })
          })
          .join('<div class="print-page"></div>')

        const success = printHtml(renderedHtml, {
          preview,
          title: config.title,
        })

        if (!success) {
          throw new Error(t('hooks.printActions.printServiceUnavailable'))
        }
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('hooks.printActions.printFailed'))
      }
    },
    [config, formatCellValue, moduleKey, selectedRowKeys, t],
  )

  return { handlePrintSelectedRecords }
}
