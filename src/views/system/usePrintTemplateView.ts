import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form } from 'antd'
import { useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { assertApiSuccess } from '@/api/core/client'
import {
  fetchSettlementCompanyOptions,
  type SettlementCompanyOption,
} from '@/api/system/company-settings'
import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
  uploadPrintTemplateJson,
} from '@/api/system/print-template'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type {
  PrintTemplateRecord,
  SavePrintTemplatePayload,
} from '@/shared/schemas'
import { message, modal } from '@/utils/antd-app'
import {
  defaultEngineForTemplateType,
  type PrintTemplateEditorFormValues,
} from '@/views/system/print-template-editor-utils'
import { buildPrintTemplateCopyName } from '@/views/system/print-template-view-utils'

interface PrintTemplateState {
  selectedBillType: string
  activeTemplateId: string | undefined
  editingBillType: string | undefined
  editorDirty: boolean
  editorOpen: boolean
  previewOpen: boolean
  previewTemplate: PrintTemplateRecord | null
}

type SavePrintTemplateMutationPayload = SavePrintTemplatePayload & {
  previousBillType?: string
}

const printTemplateInitialState: PrintTemplateState = {
  selectedBillType: printTemplateTargetOptions[0]?.value || 'purchase-order',
  activeTemplateId: undefined,
  editingBillType: undefined,
  editorDirty: false,
  editorOpen: false,
  previewOpen: false,
  previewTemplate: null,
}

function normalizedOptionalText(value: unknown) {
  const normalized = value == null ? '' : String(value).trim()
  return normalized || undefined
}

function normalizeSettlementCompanyId(
  value: unknown,
  options: SettlementCompanyOption[],
) {
  const normalizedValue = normalizedOptionalText(value)
  if (!normalizedValue) return undefined
  const matched =
    options.find((option) => String(option.value).trim() === normalizedValue) ??
    (typeof value === 'number'
      ? options.find((option) => Number(option.value) === value)
      : undefined)
  return matched?.value || normalizedValue
}

export function usePrintTemplateView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
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
    editingBillType,
    editorDirty,
    editorOpen,
    previewOpen,
    previewTemplate,
  } = state
  const [form] = Form.useForm<PrintTemplateEditorFormValues>()
  const editorCloseConfirmOpenRef = useRef(false)

  const templatesQuery = useQuery({
    queryKey: QUERY_KEYS.printTemplateByType(selectedBillType),
    queryFn: async () =>
      assertApiSuccess(
        await listPrintTemplates(selectedBillType),
        t('system.printTemplate.loadFailed'),
      ),
  })
  const { data: settlementCompanyOptions = [] } = useQuery<
    SettlementCompanyOption[]
  >({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: fetchSettlementCompanyOptions,
  })
  const templates = templatesQuery.data?.data || []

  const saveMutation = useMutation({
    mutationFn: ({
      previousBillType: _previousBillType,
      ...payload
    }: SavePrintTemplateMutationPayload) =>
      savePrintTemplate(payload).then((response) =>
        assertApiSuccess(response, t('api.saveFailed')),
      ),
    onSuccess: (_data, variables) => {
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.printTemplate })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.printTemplateByType(variables.billType),
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.printableTemplates(variables.billType),
      })
      if (
        variables.previousBillType &&
        variables.previousBillType !== variables.billType
      ) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.printableTemplates(variables.previousBillType),
        })
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.printTemplateByType(variables.previousBillType),
        })
      }
      setState({ editorDirty: false, editorOpen: false })
    },
    onError: (error: Error) => showError(error, t('api.saveFailed')),
  })
  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string; billType?: string }) =>
      deletePrintTemplate(id).then((response) =>
        assertApiSuccess(response, t('api.deleteFailed')),
      ),
    onSuccess: (_data, variables) => {
      message.success(t('common.deleteSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.printTemplate })
      void queryClient.invalidateQueries({
        queryKey: variables.billType
          ? QUERY_KEYS.printableTemplates(variables.billType)
          : QUERY_KEYS.printableTemplatesBase,
      })
    },
    onError: (error: Error) => showError(error, t('api.deleteFailed')),
  })
  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File; billType?: string }) =>
      uploadPrintTemplateJson(id, file),
    onSuccess: (_data, variables) => {
      message.success(t('system.printTemplate.uploadJsonSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.printTemplate })
      void queryClient.invalidateQueries({
        queryKey: variables.billType
          ? QUERY_KEYS.printableTemplates(variables.billType)
          : QUERY_KEYS.printableTemplatesBase,
      })
    },
    onError: (error: Error) =>
      showError(error, t('system.printTemplate.uploadJsonFailed')),
  })
  const refresh = () => {
    void templatesQuery.refetch()
  }

  const selectBillType = (value: string) => {
    setState({ activeTemplateId: undefined, selectedBillType: value })
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      billType: selectedBillType,
      templateName: '',
      templateCode: '',
      templateType: 'COORD',
      engine: 'LODOP',
      assetRef: '',
      settlementCompanyId: undefined,
      settlementCompanyName: '',
      templateHtml: '',
      versionNo: 1,
      status: 'ACTIVE',
    })
    setState({
      activeTemplateId: undefined,
      editingBillType: undefined,
      editorDirty: false,
      editorOpen: true,
    })
  }

  const openEdit = (record: PrintTemplateRecord) => {
    if (record.syncMode === 'FILE') {
      message.warning(t('system.printTemplate.fileManagedEditHint'))
      return
    }
    form.resetFields()
    form.setFieldsValue({
      id: record.id,
      billType: record.billType || selectedBillType,
      templateName: record.templateName,
      templateCode: record.templateCode || '',
      templateType: record.templateType === 'PDF_FORM' ? 'PDF_FORM' : 'COORD',
      engine:
        record.engine || defaultEngineForTemplateType(record.templateType),
      assetRef: record.assetRef || '',
      settlementCompanyId: record.settlementCompanyId || undefined,
      settlementCompanyName: record.settlementCompanyName || '',
      templateHtml: record.templateHtml || '',
      versionNo: record.versionNo || 1,
      status: record.status || 'ACTIVE',
    })
    setState({
      activeTemplateId: record.id,
      editingBillType: record.billType || selectedBillType,
      editorDirty: false,
      editorOpen: true,
    })
  }

  const openPreview = (record: PrintTemplateRecord) => {
    setState({ previewTemplate: record, previewOpen: true })
  }

  const handleCopy = (record: PrintTemplateRecord) => {
    form.resetFields()
    form.setFieldsValue({
      billType: record.billType || selectedBillType,
      templateName: buildPrintTemplateCopyName(record),
      templateCode: '',
      templateType: record.templateType === 'PDF_FORM' ? 'PDF_FORM' : 'COORD',
      engine:
        record.engine || defaultEngineForTemplateType(record.templateType),
      assetRef: record.assetRef || '',
      settlementCompanyId: record.settlementCompanyId || undefined,
      settlementCompanyName: record.settlementCompanyName || '',
      templateHtml: record.templateHtml || '',
      versionNo: record.versionNo || 1,
      status: 'ACTIVE',
    })
    setState({
      activeTemplateId: undefined,
      editingBillType: undefined,
      editorDirty: false,
      editorOpen: true,
    })
  }

  const handleDelete = (record: PrintTemplateRecord) => {
    modal.confirm({
      title: t('system.printTemplate.deleteTemplate'),
      content: t('system.printTemplate.deleteContent', {
        name: record.templateName,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: () =>
        deleteMutation.mutateAsync({
          id: record.id,
          billType: record.billType || selectedBillType,
        }),
    })
  }

  const handleUploadJson = (record: PrintTemplateRecord, file: File) => {
    if (record.templateType !== 'PDF_FORM') {
      message.warning(t('system.printTemplate.uploadPdfFormOnly'))
      return
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      message.warning(t('system.printTemplate.uploadJsonFileOnly'))
      return
    }
    if (file.size > 1024 * 1024) {
      message.warning(t('system.printTemplate.uploadJsonSizeLimit'))
      return
    }
    uploadMutation.mutate({
      id: record.id,
      file,
      billType: record.billType || selectedBillType,
    })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const templateType = values.templateType || 'COORD'
      const normalizedTemplateHtml = values.templateHtml?.trim() || ''
      const normalizedAssetRef = values.assetRef?.trim?.() || ''
      const normalizedSettlementCompanyId = normalizeSettlementCompanyId(
        values.settlementCompanyId,
        Array.isArray(settlementCompanyOptions) ? settlementCompanyOptions : [],
      )
      saveMutation.mutate({
        id: activeTemplateId || undefined,
        billType: values.billType,
        templateName: values.templateName.trim(),
        templateCode: values.templateCode?.trim?.() || undefined,
        templateHtml: normalizedTemplateHtml,
        templateType,
        engine: values.engine || defaultEngineForTemplateType(templateType),
        assetRef: normalizedAssetRef || undefined,
        settlementCompanyId: normalizedSettlementCompanyId,
        settlementCompanyName: normalizedOptionalText(
          values.settlementCompanyName,
        ),
        versionNo: values.versionNo || 1,
        status: values.status || 'ACTIVE',
        ...(editingBillType && editingBillType !== values.billType
          ? { previousBillType: editingBillType }
          : {}),
      })
    } catch {
      // validation failed
    }
  }

  const closeEditor = () => {
    setState({ editorDirty: false, editorOpen: false })
  }

  const requestEditorClose = () => {
    if (saveMutation.isPending || editorCloseConfirmOpenRef.current) return
    if (!editorDirty) {
      closeEditor()
      return
    }
    editorCloseConfirmOpenRef.current = true
    modal.confirm({
      title: t('common.unsavedChangesTitle'),
      content: t('common.unsavedChangesContent'),
      okText: t('common.discardChanges'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: closeEditor,
      afterClose: () => {
        editorCloseConfirmOpenRef.current = false
      },
    })
  }

  return {
    activeTemplateId,
    editorOpen,
    form,
    handleCopy,
    handleDelete,
    handleSave,
    handleUploadJson,
    isFetching: templatesQuery.isFetching,
    isLoading: templatesQuery.isPending,
    isQueryError: templatesQuery.isError,
    openCreate,
    openEdit,
    openPreview,
    previewOpen,
    previewTemplate,
    requestEditorClose,
    refresh,
    savePending: saveMutation.isPending,
    selectedBillType,
    settlementCompanyOptions,
    templates,
    uploadPending: uploadMutation.isPending,
    setActiveTemplateId: (value: string | undefined) =>
      setState({ activeTemplateId: value }),
    setEditorDirty: () => setState({ editorDirty: true }),
    setPreviewOpen: (value: boolean) => setState({ previewOpen: value }),
    setSelectedBillType: selectBillType,
  }
}
