import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Form } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { exportModuleData } from '@/api/business/common-export'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import type { MasterDataPageSpec, MasterFormValues } from './master-data-types'

const FALLBACK_PAGE_SIZE = 30

export function useMasterDataPage(spec: MasterDataPageSpec) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<MasterFormValues>()
  const moduleKey = spec.moduleKey

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [filterValues, setFilterValues] = useState<SearchParams>({})
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(
    spec.defaultHiddenColumnKeys,
  )
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBaseRecord, setEditorBaseRecord] =
    useState<LegacyModuleRecord | null>(null)
  const [formValues, setFormValues] = useState<MasterFormValues>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [attachmentRecordId, setAttachmentRecordId] = useState('')

  const runtimeQuery = useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: 30_000,
  })
  const runtimePageSize = runtimeQuery.data?.ui.defaultPageSize
  const effectivePageSize = useMemo(() => {
    const value = Number(runtimePageSize)
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : pageSize
  }, [runtimePageSize, pageSize])

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.businessGridList(
      moduleKey,
      submittedFilters,
      page,
      effectivePageSize,
    ),
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        submittedFilters,
        { currentPage: page, pageSize: effectivePageSize },
        { signal },
      ),
    staleTime: 5_000,
    placeholderData: keepPreviousData,
  })

  const responseCode = Number(listQuery.data?.code ?? 0)
  const hasListError = listQuery.error != null || responseCode !== 0
  const listErrorMessage =
    listQuery.error instanceof Error && listQuery.error.message.trim()
      ? listQuery.error.message.trim()
      : responseCode !== 0
        ? String(listQuery.data?.message || '').trim()
        : ''
  const records: LegacyModuleRecord[] = useMemo(
    () => (hasListError ? [] : (listQuery.data?.data?.rows ?? [])),
    [hasListError, listQuery.data],
  )
  const total = hasListError ? 0 : (listQuery.data?.data?.total ?? 0)

  const selectedRowKeySet = useMemo(
    () => new Set(selectedRowKeys),
    [selectedRowKeys],
  )
  const selectedRows = useMemo(
    () => records.filter((row) => selectedRowKeySet.has(String(row.id))),
    [records, selectedRowKeySet],
  )
  const singleSelected = selectedRows.length === 1 ? selectedRows[0] : undefined
  const singleCanEdit = singleSelected
    ? resolveModuleRecordCapabilities(singleSelected, moduleKey).canEdit
    : false

  const hiddenKeySet = useMemo(
    () => new Set(hiddenColumnKeys),
    [hiddenColumnKeys],
  )

  const refreshModuleQueries = async () => {
    const masterOptionQueryKey = getMasterOptionQueryKey(moduleKey)
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(moduleKey),
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGridAll(moduleKey),
      }),
      ...(masterOptionQueryKey
        ? [queryClient.invalidateQueries({ queryKey: masterOptionQueryKey })]
        : []),
    ])
  }

  const clearSelection = () => setSelectedRowKeys([])

  const applyFilters = (next: SearchParams) => {
    clearSelection()
    setPage(1)
    setSubmittedFilters(next)
  }

  const handleSearch = () => {
    const next: SearchParams = { ...filterValues }
    const trimmed = keyword.trim()
    next.keyword = trimmed || undefined
    applyFilters(next)
  }

  const handleFilterChange = (key: string, value: string | undefined) => {
    setFilterValues((previous) => ({ ...previous, [key]: value }))
  }

  const handleResetFilters = () => {
    setKeyword('')
    setFilterValues({})
    applyFilters({})
  }

  const handleRefresh = () => {
    clearSelection()
    void refreshModuleQueries()
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== effectivePageSize) {
      setPageSize(nextPageSize)
    }
    setPage(nextPage)
    clearSelection()
  }

  const openEditor = (record: LegacyModuleRecord | null) => {
    setExpandedRowKeys([])
    const values = spec.buildValues(record)
    setEditorBaseRecord(record ? { ...record } : null)
    setFormValues(values)
    form.resetFields()
    form.setFieldsValue(values)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorBaseRecord(null)
    form.resetFields()
  }

  const handleEditorSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const draft: LegacyModuleRecordInput = spec.buildRecord(
        values,
        editorBaseRecord,
      )
      await saveBusinessModule(moduleKey, draft)
      message.success(t('modules.saveResult.success'))
      setEditorOpen(false)
      setEditorBaseRecord(null)
      clearSelection()
      await refreshModuleQueries()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSelected = () => {
    if (!selectedRows.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    const eligible = selectedRows.filter(
      (record) => resolveModuleRecordCapabilities(record, moduleKey).canDelete,
    )
    if (!eligible.length) {
      message.warning(t('hooks.batchActions.deleteNotSupported'))
      return
    }
    modal.confirm({
      title: t('hooks.batchActions.batchDelete'),
      content: t('hooks.batchActions.batchDeleteConfirm', {
        count: eligible.length,
        skippedPart: '',
      }),
      okButtonProps: { danger: true },
      onOk: async () => {
        const results = await Promise.allSettled(
          eligible.map((record) =>
            deleteBusinessModule(moduleKey, String(record.id)),
          ),
        )
        const successCount = results.filter(
          (result) => result.status === 'fulfilled',
        ).length
        const failedCount = results.length - successCount
        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.actionCompletedWithFailures', {
              action: t('hooks.toolbarActions.delete'),
              successCount,
              failedCount,
              skippedPart: '',
              errorPart: '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.actionSuccess', {
              action: t('hooks.toolbarActions.delete'),
              successCount,
              skippedPart: '',
            }),
          )
        }
        await refreshModuleQueries()
      },
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportModuleData(moduleKey, submittedFilters)
      message.success(t('hooks.excelExport.exportSuccess'))
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('hooks.excelExport.exportFailed'),
      )
    } finally {
      setExporting(false)
    }
  }

  const handleToggleRecordSelected = (record: LegacyModuleRecord) => {
    setSelectedRowKeys((previous) => {
      const recordKey = String(record.id)
      return previous.includes(recordKey)
        ? previous.filter((key) => key !== recordKey)
        : [...previous, recordKey]
    })
  }

  const handleRecordDoubleClick = (record: LegacyModuleRecord) => {
    if (resolveModuleRecordCapabilities(record, moduleKey).canEdit) {
      openEditor(record)
    }
  }

  const handleAttachment = () => {
    if (singleSelected) {
      setAttachmentRecordId(String(singleSelected.id))
    }
  }

  return {
    t,
    form,
    moduleKey,
    page,
    effectivePageSize,
    keyword,
    setKeyword,
    filterValues,
    handleFilterChange,
    handleSearch,
    handleResetFilters,
    selectedRowKeys,
    setSelectedRowKeys,
    selectedRows,
    singleSelected,
    singleCanEdit,
    hiddenColumnKeys,
    setHiddenColumnKeys,
    hiddenKeySet,
    expandedRowKeys,
    setExpandedRowKeys,
    editorOpen,
    editorBaseRecord,
    formValues,
    setFormValues,
    saving,
    exporting,
    attachmentRecordId,
    setAttachmentRecordId,
    records,
    total,
    hasListError,
    listErrorMessage,
    listQuery,
    openEditor,
    closeEditor,
    handleEditorSave,
    handleDeleteSelected,
    handleExport,
    handlePageChange,
    handleRefresh,
    clearSelection,
    handleToggleRecordSelected,
    handleRecordDoubleClick,
    handleAttachment,
  }
}
