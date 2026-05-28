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
import { renderPrintTemplate } from '@/utils/print-template-renderer'
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
          // 从后端获取原始模版 + 数据，前端渲染
          const results = await Promise.all(
            selectedRecords.map((record) =>
              http.post<{
                code: number
                data: {
                  templateHtml: string
                  templateType: string
                  data: Record<string, string>
                  items: Record<string, string>[]
                }
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

          // 前端渲染模版
          const rendered = results
            .map((r) => {
              const d = r.data
              if (!d?.templateHtml) return null
              return renderPrintTemplate(
                d.templateHtml,
                d.templateType || 'HTML',
                d.data || {},
                d.items || [],
                moduleKey,
              )
            })
            .filter(Boolean)

          const coordResults = rendered.filter((r) => r!.type === 'COORD')
          const htmlResults = rendered.filter((r) => r!.type === 'HTML')

          for (const r of coordResults) {
            if (!r?.script) continue
            const success = execPrintCode(r.script, {
              preview,
              title: template.templateName || config.title,
            })
            if (!success) throw new Error(t('hooks.printActions.printServiceUnavailable'))
          }

          if (htmlResults.length) {
            const htmlContents = htmlResults
              .map((r) => r?.html)
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
