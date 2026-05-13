/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { asString } from '@/utils/type-narrowing'
import { useCallback } from 'react'
import { getBusinessModuleDetail } from '@/api/business'
import { getDefaultPrintTemplate } from '@/api/print-template'
import type { ModulePageConfig } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { execPrintCode, isCLodopCode, printHtml } from '@/utils/clodop'
import { buildModulePrintHtml } from '@/utils/module-print'
import { renderPrintTemplate } from '@/utils/print-template-engine'

interface Props {
  moduleKey: string
  config: ModulePageConfig
  selectedRowKeys: string[]
  formatCellValue: (value: unknown, columnType?: string) => string
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

      try {
        const templateResponse = await getDefaultPrintTemplate(moduleKey)
        const template = templateResponse.data
        const selectedDetails = await Promise.all(
          selectedRowKeys.map((id) => getBusinessModuleDetail(moduleKey, id)),
        )
        const selectedRecords = selectedDetails.map((detail) => detail.data)

        if (!selectedRecords.length) {
          message.warning('未找到可打印的选中记录')
          return
        }

        if (template?.templateHtml?.trim()) {
          const renderedTemplates = selectedRecords.map((record) =>
            renderPrintTemplate(
              template.templateHtml,
              record,
              Array.isArray(record.items)
                ? (record.items as Array<Record<string, unknown>>)
                : [],
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
