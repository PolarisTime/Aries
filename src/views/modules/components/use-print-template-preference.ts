import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormInstance } from 'antd'
import { Form } from 'antd'
import { useEffect } from 'react'
import {
  fetchPrintTemplatePreference,
  savePrintTemplatePreference,
} from '@/api/system/print-template'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { pickDefaultPrintTemplate } from '@/utils/print-template'
import type { PrintJobFormValues } from '@/views/modules/components/print-job-modal-state'

/**
 * 打印模板的项目级偏好：查询 + 记忆 + 默认模板回填。
 *
 * <p>抽出原因：这段状态编排在 PrintJobModal 里约占 50 行、7 个分支（偏好查询、
 * 默认模板补写竞态、成功后记忆），是 no-giant-component 与
 * no-high-complexity-react-function 的共同来源。行为保持不变：模板列表晚于弹窗
 * 挂载到达时补写默认模板，并等偏好查询结束后再补写，避免先用默认值覆盖。</p>
 */

interface Options {
  form: FormInstance<PrintJobFormValues>
  moduleKey: string
  open: boolean
  projectId: string
  templates: PrintTemplateRecord[]
}

export function usePrintTemplatePreference({
  form,
  moduleKey,
  open,
  projectId,
  templates,
}: Options) {
  const queryClient = useQueryClient()
  const templateIdFromForm = Form.useWatch('templateId', form)
  // 项目级偏好: 记住该项目在当前单据类型下上次所选模板, 作为默认回填。
  const projectPreferenceQuery = useQuery({
    queryKey: QUERY_KEYS.printTemplatePreference(projectId, moduleKey),
    queryFn: ({ signal }) =>
      fetchPrintTemplatePreference(projectId, moduleKey, signal),
    enabled: open && Boolean(projectId),
    staleTime: 60 * 1000,
  })
  const preferredTemplate = projectPreferenceQuery.data
    ? templates.find(
        (template) => template.id === projectPreferenceQuery.data?.templateId,
      )
    : undefined
  // 打印/导出成功后记忆项目级偏好(预览不记忆); 失败静默, 不影响打印主流程。
  const rememberPreference = useMutation({
    mutationFn: (templateId: string) =>
      savePrintTemplatePreference({
        projectId,
        billType: moduleKey,
        templateId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.printTemplatePreference(projectId, moduleKey),
      })
    },
  })
  const fallbackTemplate = pickDefaultPrintTemplate(templates)
  const selectedTemplate =
    templates.find((template) => template.id === templateIdFromForm) ??
    preferredTemplate ??
    fallbackTemplate

  // 模板列表晚于弹窗挂载到达时，补写默认模板，保证 Select 与实际输出一致。
  // 优先项目偏好, 其次 is_default/首个；等偏好查询结束后再补写, 避免先用默认值覆盖。
  useEffect(() => {
    if (!open) return
    const currentTemplateId: unknown = form.getFieldValue('templateId')
    if (currentTemplateId) return
    if (projectId && projectPreferenceQuery.isPending) return
    const defaultTemplate = preferredTemplate ?? fallbackTemplate
    if (defaultTemplate) {
      form.setFieldValue('templateId', defaultTemplate.id)
    }
  }, [
    form,
    open,
    projectId,
    preferredTemplate,
    fallbackTemplate,
    projectPreferenceQuery.isPending,
  ])

  return {
    selectedTemplate,
    /** 实际打印/导出成功后记忆项目级模板偏好(预览不记忆); 无项目时静默跳过。 */
    rememberTemplateUsed: (templateId: string) => {
      if (projectId) rememberPreference.mutate(templateId)
    },
  }
}
