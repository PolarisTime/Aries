import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import Form from 'antd/es/form'
import { useCallback, useState } from 'react'
import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
} from '@/api/print-template'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import type { PrintTemplateRecord } from '@/types/print-template'
import { PrintTemplateEditorModal } from '@/views/system/PrintTemplateEditorModal'
import { PrintTemplatePreviewModal } from '@/views/system/PrintTemplatePreviewModal'
import { PrintTemplateTableCard } from '@/views/system/PrintTemplateTableCard'
import { buildPrintTemplateCopyName } from '@/views/system/print-template-view-utils'
import { message, modal } from '@/utils/antd-app'

export function PrintTemplateView() {
  const queryClient = useQueryClient()
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
    queryKey: ['print-template', selectedBillType],
    queryFn: () => listPrintTemplates(selectedBillType),
  })
  const templates = templatesResponse?.data || []

  const saveMutation = useMutation({
    mutationFn: savePrintTemplate,
    onSuccess: () => {
      message.success('保存成功')
      void queryClient.invalidateQueries({ queryKey: ['print-template'] })
      setEditorOpen(false)
    },
    onError: (error: Error) => showError(error, '保存失败'),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePrintTemplate,
    onSuccess: () => {
      message.success('删除成功')
      void queryClient.invalidateQueries({ queryKey: ['print-template'] })
    },
    onError: (error: Error) => showError(error, '删除失败'),
  })

  const refresh = useRefreshQuery('print-template')

  const openCreate = useCallback(() => {
    if (!canCreate) {
      message.warning('暂无创建权限')
      return
    }
    form.resetFields()
    form.setFieldsValue({
      billType: selectedBillType,
      templateName: '',
      isDefault: false,
    })
    setTemplateHtml('')
    setActiveTemplateId(undefined)
    setEditorOpen(true)
  }, [canCreate, form, selectedBillType])

  const openEdit = useCallback(
    (record: PrintTemplateRecord) => {
      if (!canEdit) {
        message.warning('暂无编辑权限')
        return
      }
      form.setFieldsValue({
        id: record.id,
        billType: record.billType || selectedBillType,
        templateName: record.templateName,
        isDefault: record.isDefault ?? false,
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
        message.warning('暂无创建权限')
        return
      }
      form.setFieldsValue({
        billType: record.billType || selectedBillType,
        templateName: buildPrintTemplateCopyName(record),
        isDefault: false,
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
        message.warning('暂无删除权限')
        return
      }
      modal.confirm({
        title: '删除打印模板',
        content: `确定删除模板「${record.templateName}」吗？`,
        okText: '确认删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: () => deleteMutation.mutateAsync(record.id),
      })
    },
    [canDelete, deleteMutation],
  )

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      if (!templateHtml.trim()) {
        message.warning('请输入模板内容')
        return
      }
      saveMutation.mutate({
        id: activeTemplateId || undefined,
        billType: values.billType,
        templateName: values.templateName.trim(),
        templateHtml: templateHtml.trim(),
        isDefault: values.isDefault ?? false,
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
