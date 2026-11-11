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
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import {
  type BatchFailure,
  showBatchFailureNotification,
} from '@/components/batch-failure-notification'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_LONG, STALE_REALTIME } from '@/constants/query-policies'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import { describeTargetRecordNo } from '@/hooks/useBusinessGridBatchActions'
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
    staleTime: STALE_LONG,
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
    staleTime: STALE_REALTIME,
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
    if (!record && spec.primaryNoKey) {
      const primaryNoKey = spec.primaryNoKey
      void fetchGeneratedMasterDataCode(moduleKey)
        .then((code) => {
          form.setFieldsValue({ [primaryNoKey]: code })
          setFormValues((previous) => ({ ...previous, [primaryNoKey]: code }))
        })
        .catch(() => {
          // 生成失败时留空，保存时由后端校验提示
        })
    }
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorBaseRecord(null)
    form.resetFields()
  }

  const handleEditorSave = async () => {
    let values: MasterFormValues
    try {
      values = await form.validateFields()
    } catch {
      // 必填校验失败时 antd 已内联提示，直接返回，避免未处理的 Promise rejection。
      return
    }
    setSaving(true)
    try {
      const draft: LegacyModuleRecordInput = spec.buildRecord(
        values,
        editorBaseRecord,
      )
      const saved = await saveBusinessModule(moduleKey, draft)
      /*
       * 模块专属收尾（如供应商的品牌规格配置）：附属数据自带端点、且需要记录 id，
       * 所以只能在记录保存之后提交 —— 新建时也才有 id。
       *
       * 失败时记录已经落库：提示「保存成功但附属配置失败」并照常关闭编辑器刷列表，
       * 不能把编辑框留着让用户再点一次保存（那会覆盖刚存好的记录）。
       */
      let afterSaveError: unknown = null
      if (spec.afterSave) {
        try {
          await spec.afterSave({ values, saved })
        } catch (error) {
          afterSaveError = error
        }
      }
      if (afterSaveError) {
        message.error(
          afterSaveError instanceof Error
            ? afterSaveError.message
            : t('api.saveFailed'),
        )
      } else {
        message.success(t('modules.saveResult.success'))
      }
      setEditorOpen(false)
      setEditorBaseRecord(null)
      clearSelection()
      await refreshModuleQueries()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setSaving(false)
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
          /*
           * 删除失败逐条列出来（卡片式通知）：主数据删除同样可能因为"被单据引用"等原因
           * 个别失败，只报"失败 N 条"用户没法判断该重试哪几条。
           */
          const failures: BatchFailure[] = []
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') return
            failures.push({
              no: describeTargetRecordNo(eligible[index]),
              reason:
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.deleteFailed'),
            })
          })
          showBatchFailureNotification({
            title: t('hooks.batchActions.deleteCompletedWithFailuresShort', {
              successCount,
              failedCount,
              skippedPart: '',
            }),
            failures,
          })
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
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setExporting(false)
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
