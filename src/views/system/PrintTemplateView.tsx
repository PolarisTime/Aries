import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
} from '@/api/print-template'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePermissionStore } from '@/stores/permissionStore'
import type { PrintTemplateRecord } from '@/types/print-template'
import { message, modal } from '@/utils/antd-app'
import { PrintTemplateEditorModal } from '@/views/system/PrintTemplateEditorModal'
import { PrintTemplatePreviewModal } from '@/views/system/PrintTemplatePreviewModal'
import { PrintTemplateTableCard } from '@/views/system/PrintTemplateTableCard'
import { buildPrintTemplateCopyName } from '@/views/system/print-template-view-utils'

export function PrintTemplateView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canCreate = permissionStore.can('print-template', 'create')
  const canEdit = permissionStore.can('print-template', 'update')
  const canDelete = permissionStore.can('print-template', 'delete')

  const [selectedBillType, setSelectedBillType] = useState(
    printTemplateTargetOptions[0]?.value || 'purchase-order',
  )
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] =
    useState<PrintTemplateRecord | null>(null)
  const [templateHtml, setTemplateHtml] = useState('')
  const [form] = Form.useForm()

  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: QUERY_KEYS.printTemplateByType(selectedBillType),
    queryFn: () => listPrintTemplates(selectedBillType),
  })
  const templates = templatesResponse?.data || []

  const saveMutation = useMutation({
    mutationFn: savePrintTemplate,
    onSuccess: () => {
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.printTemplate })
      setEditorOpen(false)
    },
    onError: (error: Error) => showError(error, t('api.saveFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePrintTemplate,
    onSuccess: () => {
      message.success(t('common.deleteSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.printTemplate })
    },
    onError: (error: Error) => showError(error, t('api.deleteFailed')),
  })

  const refresh = useRefreshQuery('print-template')

  const openCreate = useCallback(() => {
    if (!canCreate) {
      message.warning(t('common.noPermission'))
      return
    }
    form.resetFields()
    form.setFieldsValue({
      billType: selectedBillType,
      templateName: '',
      templateType: 'HTML',
    })
    setTemplateHtml('')
    setActiveTemplateId(undefined)
    setEditorOpen(true)
  }, [canCreate, form, selectedBillType])

  const openEdit = useCallback(
    (record: PrintTemplateRecord) => {
      if (!canEdit) {
        message.warning(t('common.noPermission'))
        return
      }
      form.setFieldsValue({
        id: record.id,
        billType: record.billType || selectedBillType,
        templateName: record.templateName,
        templateType: record.templateType || 'HTML',
      })
      setTemplateHtml(record.templateHtml || '')
      setActiveTemplateId(record.id)
      setEditorOpen(true)
    },
    [canEdit, form, selectedBillType],
  )

  const openPreview = useCallback((record: PrintTemplateRecord) => {
    setPreviewTemplate(record)
    setPreviewOpen(true)
  }, [])

  const handleCopy = useCallback(
    (record: PrintTemplateRecord) => {
      if (!canCreate) {
        message.warning(t('common.noPermission'))
        return
      }
      form.setFieldsValue({
        billType: record.billType || selectedBillType,
        templateName: buildPrintTemplateCopyName(record),
        templateType: record.templateType || 'HTML',
      })
      setTemplateHtml(record.templateHtml || '')
      setActiveTemplateId(undefined)
      setEditorOpen(true)
    },
    [canCreate, form, selectedBillType],
  )

  const handleDelete = useCallback(
    (record: PrintTemplateRecord) => {
      if (!canDelete) {
        message.warning(t('common.noPermission'))
        return
      }
      modal.confirm({
        title: t('system.printTemplate.deleteTemplate'),
        content: t('system.printTemplate.deleteContent', {
          name: record.templateName,
        }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: () => deleteMutation.mutateAsync(record.id),
      })
    },
    [canDelete, deleteMutation],
  )

  const handleSave = useCallback(async () => {
    if (!templateHtml.trim()) {
      message.warning(t('system.printTemplate.inputTemplateContent'))
      return
    }
    try {
      const values = await form.validateFields()
      saveMutation.mutate({
        id: activeTemplateId || undefined,
        billType: values.billType,
        templateName: values.templateName.trim(),
        templateHtml: templateHtml.trim(),
        templateType: values.templateType || 'HTML',
      })
    } catch {
      // validation failed
    }
  }, [activeTemplateId, form, saveMutation, templateHtml])

  return (
    <div className="page-stack">
      <PrintTemplateTableCard
        selectedBillType={selectedBillType}
        activeTemplateId={activeTemplateId}
        templates={templates}
        loading={isLoading}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        onBillTypeChange={setSelectedBillType}
        onRefresh={refresh}
        onCreate={openCreate}
        onPreview={openPreview}
        onEdit={openEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onActiveChange={setActiveTemplateId}
      />

      {editorOpen ? (
        <PrintTemplateEditorModal
          open={editorOpen}
          editing={Boolean(activeTemplateId)}
          form={form}
          templateHtml={templateHtml}
          saving={saveMutation.isPending}
          onTemplateHtmlChange={setTemplateHtml}
          onSave={() => {
            void handleSave()
          }}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}

      {previewOpen ? (
        <PrintTemplatePreviewModal
          open={previewOpen}
          template={previewTemplate}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  )
}
