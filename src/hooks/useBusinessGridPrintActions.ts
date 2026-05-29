import { createElement } from 'react'
import { useTranslation } from 'react-i18next'
import { assertApiSuccess, http } from '@/api/client'
import { listPrintTemplates } from '@/api/print-template'
import { PrintTemplateSelector } from '@/components/PrintTemplateSelector'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/types/print-template'
import { message, modal } from '@/utils/antd-app'
import { execPrintCode, loadCLodop, printHtml } from '@/utils/clodop'
import { renderPrintTemplate } from '@/utils/print-template-renderer'

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
}

interface PrintRecordResponse {
  templateName?: string
  templateHtml: string
  templateType: string
  data: Record<string, string>
  items: Record<string, string>[]
}

function requirePrintService(success: boolean, message: string) {
  if (!success) {
    throw new Error(message)
  }
}

async function pickPrintTemplate(
  moduleKey: string,
  t: (key: string) => string,
): Promise<PrintTemplateRecord | null> {
  if (!Object.hasOwn(printTemplateTargetMap, moduleKey)) return null
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
  selectedRowKeys,
}: Props) {
  const { t } = useTranslation()
  const handlePrintSelectedRecords = async (
    preview: boolean,
    templateId?: string,
  ) => {
    if (!selectedRowKeys.length) {
      message.warning(t('common.pleaseSelect'))
      return
    }

    const template = templateId
      ? {
          id: templateId,
          templateName: '',
          billType: moduleKey,
          templateHtml: '',
        }
      : await pickPrintTemplate(moduleKey, t)

    if (!template) {
      message.warning(t('hooks.printActions.noPrintTemplateConfigured'))
      return
    }

    try {
      // 确保 CLodop 脚本已加载（main.tsx 预加载 + 此处兜底）
      await loadCLodop()

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
          }),
        ),
      )
      for (const r of results) {
        assertApiSuccess(r, t('hooks.printActions.printScriptGenerationFailed'))
      }

      const rendered = results
        .map((r) => {
          const d = r.data
          if (!d?.templateHtml) return null
          return {
            title: d.templateName || template.templateName,
            result: renderPrintTemplate(
              d.templateHtml,
              d.templateType || 'HTML',
              d.data || {},
              d.items || [],
              moduleKey,
            ),
          }
        })
        .filter((r): r is NonNullable<typeof r> => Boolean(r))

      const coordResults = rendered.filter((r) => r.result.type === 'COORD')
      const htmlResults = rendered.filter((r) => r.result.type === 'HTML')

      for (const r of coordResults) {
        if (!r.result.script) continue
        const success = execPrintCode(r.result.script, {
          preview,
          title: r.title,
        })
        requirePrintService(
          success,
          t('hooks.printActions.printServiceUnavailable'),
        )
      }

      const htmlContents = htmlResults
        .map((r) => r.result.html)
        .filter((html): html is string => Boolean(html))
      if (htmlContents.length) {
        const success = printHtml(
          htmlContents.join('<div class="print-page"></div>'),
          {
            preview,
            title: htmlResults[0]?.title,
          },
        )
        if (!success)
          requirePrintService(
            success,
            t('hooks.printActions.printServiceUnavailable'),
          )
      }

      if (!coordResults.length && !htmlResults.length) {
        message.warning(t('hooks.printActions.noPrintContent'))
      }
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t('hooks.printActions.printFailed'),
      )
    }
  }

  return { handlePrintSelectedRecords }
}
