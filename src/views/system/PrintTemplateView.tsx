import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Form from 'antd/es/form'
import { useReducer } from 'react'
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

interface PrintTemplateState {
  selectedBillType: string
  activeTemplateId: string | undefined
  editorOpen: boolean
  previewOpen: boolean
  previewTemplate: PrintTemplateRecord | null
  templateHtml: string
}

const printTemplateInitialState: PrintTemplateState = {
  selectedBillType: printTemplateTargetOptions[0]?.value || 'purchase-order',
  activeTemplateId: undefined,
  editorOpen: false,
  previewOpen: false,
  previewTemplate: null,
  templateHtml: '',
}

export function PrintTemplateView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canCreate = permissionStore.can('print-template', 'create')
  const canEdit = permissionStore.can('print-template', 'update')
  const canDelete = permissionStore.can('print-template', 'delete')

  const [state, setState] = useReducer(
    (prev: PrintTemplateState, patch: Partial<PrintTemplateState>) => ({
      ...prev,
      ...patch,
    }),
    printTemplateInitialState,
  )
  const {
    selectedBillType,
    activeTemplateId,
    editorOpen,
    previewOpen,
    previewTemplate,
    templateHtml,
  } = state
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
      setState({ editorOpen: false })
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

  const openCreate = () => {
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
    setState({
      templateHtml: '',
      activeTemplateId: undefined,
      editorOpen: true,
    })
  }

  const openEdit = (record: PrintTemplateRecord) => {
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
    setState({
      templateHtml: record.templateHtml || '',
      activeTemplateId: record.id,
      editorOpen: true,
    })
  }

  const openPreview = (record: PrintTemplateRecord) => {
    setState({ previewTemplate: record, previewOpen: true })
  }

  const handleCopy = (record: PrintTemplateRecord) => {
    if (!canCreate) {
      message.warning(t('common.noPermission'))
      return
    }
    form.setFieldsValue({
      billType: record.billType || selectedBillType,
      templateName: buildPrintTemplateCopyName(record),
      templateType: record.templateType || 'HTML',
    })
    setState({
      templateHtml: record.templateHtml || '',
      activeTemplateId: undefined,
      editorOpen: true,
    })
  }

  const handleDelete = (record: PrintTemplateRecord) => {
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
  }

  const handleSave = async () => {
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
  }

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
        onBillTypeChange={(value) => setState({ selectedBillType: value })}
        onRefresh={refresh}
        onCreate={openCreate}
        onPreview={openPreview}
        onEdit={openEdit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onActiveChange={(value) => setState({ activeTemplateId: value })}
      />

      {editorOpen ? (
        <PrintTemplateEditorModal
          open={editorOpen}
          editing={Boolean(activeTemplateId)}
          form={form}
          templateHtml={templateHtml}
          saving={saveMutation.isPending}
          onTemplateHtmlChange={(value) => setState({ templateHtml: value })}
          onSave={() => {
            void handleSave()
          }}
          onClose={() => setState({ editorOpen: false })}
        />
      ) : null}

      {previewOpen ? (
        <PrintTemplatePreviewModal
          open={previewOpen}
          template={previewTemplate}
          onClose={() => setState({ previewOpen: false })}
        />
      ) : null}
    </div>
  )
}
