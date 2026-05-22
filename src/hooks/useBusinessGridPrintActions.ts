import { createElement, useCallback } from 'react'
import { getBusinessModuleDetail } from '@/api/business'
import { listPrintTemplates } from '@/api/print-template'
import { PrintTemplateSelector } from '@/hooks/PrintTemplateSelector'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import type { PrintTemplateRecord } from '@/types/print-template'
import { message, modal } from '@/utils/antd-app'
import {
  execPrintCode,
  isCLodopCode,
  loadCLodop,
  printHtml,
} from '@/utils/clodop'
import { buildModulePrintHtml } from '@/utils/module-print'
import { renderPrintTemplate } from '@/utils/print-template-engine'
import { asArray, asString } from '@/utils/type-narrowing'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  selectedRowKeys: string[]
  formatCellValue: (value: unknown, columnType?: string) => string
}

async function pickPrintTemplate(
  moduleKey: string,
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
      title: '选择打印模板',
      width: 480,
      icon: null,
      okText: '确定',
      cancelText: '取消',
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
  const handlePrintSelectedRecords = useCallback(
    async (preview: boolean) => {
      if (!selectedRowKeys.length) {
        message.warning('请先选择记录')
        return
      }

      const template = await pickPrintTemplate(moduleKey)

      try {
        const selectedDetails = await Promise.all(
          selectedRowKeys.map((id) => getBusinessModuleDetail(moduleKey, id)),
        )
        const selectedRecords = selectedDetails.map((detail) => detail.data)

        if (!selectedRecords.length) {
          message.warning('未找到可打印的选中记录')
          return
        }

        // 确保 CLodop 脚本已加载（main.tsx 预加载 + 此处兜底）
        await loadCLodop()

        if (template?.templateHtml?.trim()) {
          const renderedTemplates = selectedRecords.map((record) =>
            renderPrintTemplate(
              template.templateHtml,
              record,
              asArray<ModuleLineItem>(record.items),
            ),
          )
          const renderedHtml = isCLodopCode(template.templateHtml)
            ? renderedTemplates.join('\nLODOP.NEWPAGEA();\n')
            : renderedTemplates.join('<div class="print-page"></div>')

          const success = isCLodopCode(template.templateHtml)
            ? execPrintCode(renderedHtml, {
                preview,
                title: template.templateName || config.title,
              })
            : printHtml(renderedHtml, {
                preview,
                title: template.templateName || config.title,
              })

          if (!success) {
            throw new Error('打印服务不可用，请检查 CLodop 或打印模板配置')
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
          throw new Error('打印服务不可用，请检查 CLodop 环境')
        }
      } catch (err) {
        message.error(err instanceof Error ? err.message : '打印失败')
      }
    },
    [config, formatCellValue, moduleKey, selectedRowKeys],
  )

  return { handlePrintSelectedRecords }
}
