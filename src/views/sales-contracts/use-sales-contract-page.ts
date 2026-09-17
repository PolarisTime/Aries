import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Form } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchProjectOptions } from '@/api/master/project-options'
import type {
  SalesContractResponse,
  SalesContractStatus,
} from '@/api/sales/sales-contracts'
import {
  deleteSalesContract,
  listSalesContracts,
  updateSalesContractStatus,
} from '@/api/sales/sales-contracts'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import {
  buildSalesContractFormValues,
  getStatusActionTarget,
  resolveSalesContractCapabilities,
  type SalesContractFormValues,
  type SalesContractStatusActionKind,
} from './sales-contract-model'

interface SalesContractFilters {
  keyword?: string
  customerId?: string
  projectId?: string
  status?: SalesContractStatus
}

/**
 * 销售合同页面状态与副作用集合。
 * 从页面组件抽取，保持渲染层简洁并便于复用/测试。
 */
export function useSalesContractPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<SalesContractFormValues>()
  const defaultPageSize = useDefaultPageSize()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [keyword, setKeyword] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState<string | undefined>()
  const [filterProjectId, setFilterProjectId] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<
    SalesContractStatus | undefined
  >()
  const [submittedFilters, setSubmittedFilters] =
    useState<SalesContractFilters>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBaseRecord, setEditorBaseRecord] =
    useState<SalesContractResponse | null>(null)
  const [editorCustomerId, setEditorCustomerId] = useState('')
  const [detailContractId, setDetailContractId] = useState('')

  useEffect(() => {
    setPageSize(defaultPageSize)
  }, [defaultPageSize])

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const customerOptions = useMemo(
    () => customerQuery.data ?? [],
    [customerQuery.data],
  )

  const filterProjectsQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.project(filterCustomerId || 'none'),
    queryFn: () =>
      filterCustomerId
        ? fetchProjectOptions(filterCustomerId)
        : Promise.resolve([]),
    enabled: Boolean(filterCustomerId),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const editorProjectsQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.project(editorCustomerId || 'none'),
    queryFn: () =>
      editorCustomerId
        ? fetchProjectOptions(editorCustomerId)
        : Promise.resolve([]),
    enabled: editorOpen && Boolean(editorCustomerId),
    staleTime: STALE_MASTER_OPTIONS,
  })

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.salesContracts({
      ...submittedFilters,
      page,
      size: pageSize,
    }),
    queryFn: ({ signal }) =>
      listSalesContracts(
        {
          keyword: submittedFilters.keyword,
          customerId: submittedFilters.customerId,
          projectId: submittedFilters.projectId,
          status: submittedFilters.status,
          page: page - 1,
          size: pageSize,
        },
        signal,
      ),
    staleTime: STALE_REALTIME,
    placeholderData: keepPreviousData,
  })

  const hasListError = listQuery.error != null
  const listErrorMessage =
    listQuery.error instanceof Error ? listQuery.error.message.trim() : ''
  const records: SalesContractResponse[] = useMemo(
    () => (hasListError ? [] : (listQuery.data?.content ?? [])),
    [hasListError, listQuery.data],
  )
  const total = hasListError ? 0 : (listQuery.data?.totalElements ?? 0)

  const selectedRowKeySet = useMemo(
    () => new Set(selectedRowKeys),
    [selectedRowKeys],
  )
  const selectedRows = useMemo(
    () => records.filter((row) => selectedRowKeySet.has(String(row.id))),
    [records, selectedRowKeySet],
  )
  const selectedRecord = selectedRows.length === 1 ? selectedRows[0] : undefined
  const capabilities = resolveSalesContractCapabilities(selectedRecord)

  const refreshQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.salesContractsBase,
    })
  }

  const clearSelection = () => setSelectedRowKeys([])

  const applyFilters = (next: SalesContractFilters) => {
    clearSelection()
    setPage(1)
    setSubmittedFilters(next)
  }

  const handleSearch = () => {
    applyFilters({
      keyword: keyword.trim() || undefined,
      customerId: filterCustomerId || undefined,
      projectId: filterProjectId || undefined,
      status: filterStatus || undefined,
    })
  }

  const handleResetFilters = () => {
    setKeyword('')
    setFilterCustomerId(undefined)
    setFilterProjectId(undefined)
    setFilterStatus(undefined)
    applyFilters({})
  }

  const handleFilterCustomerChange = (value: string | undefined) => {
    setFilterCustomerId(value || undefined)
    setFilterProjectId(undefined)
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize)
    }
    setPage(nextPage)
    clearSelection()
  }

  const handleRefresh = () => {
    clearSelection()
    void refreshQueries()
  }

  const openEditor = (record: SalesContractResponse | null) => {
    const values = buildSalesContractFormValues(record)
    setEditorBaseRecord(record ? { ...record } : null)
    setEditorCustomerId(values.customerId)
    form.resetFields()
    form.setFieldsValue(values)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorBaseRecord(null)
    setEditorCustomerId('')
    form.resetFields()
  }

  const handleEditorSaved = async () => {
    clearSelection()
    await refreshQueries()
  }

  const handleToggleRecordSelected = (record: SalesContractResponse) => {
    setSelectedRowKeys((previous) => {
      const recordKey = String(record.id)
      return previous.includes(recordKey)
        ? previous.filter((key) => key !== recordKey)
        : [...previous, recordKey]
    })
  }

  const handleRecordDoubleClick = (record: SalesContractResponse) => {
    if (resolveSalesContractCapabilities(record).canEdit) {
      openEditor(record)
    }
  }

  const handleDeleteSelected = () => {
    if (!selectedRecord) {
      return
    }
    const record = selectedRecord
    modal.confirm({
      title: t('modules.salesContract.deleteConfirmTitle'),
      content: t('modules.salesContract.deleteConfirmContent', {
        contractNo: asString(record.contractNo),
      }),
      okButtonProps: { danger: true },
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await deleteSalesContract(record.id)
        message.success(t('modules.salesContract.deleteSuccess'))
        await handleEditorSaved()
      },
    })
  }

  const performStatusChange = (kind: SalesContractStatusActionKind) => {
    if (!selectedRecord) {
      return
    }
    const record = selectedRecord
    const target = getStatusActionTarget(kind)
    modal.confirm({
      title: t('modules.salesContract.statusChangeConfirmTitle'),
      content: t('modules.salesContract.statusChangeConfirmContent', {
        contractNo: asString(record.contractNo),
        status: target,
      }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await updateSalesContractStatus(record.id, target)
        message.success(t('modules.salesContract.statusChangeSuccess'))
        await handleEditorSaved()
      },
    })
  }

  const handleViewDetailSelected = () => {
    if (selectedRecord) {
      setDetailContractId(String(selectedRecord.id))
    }
  }

  return {
    t,
    form,
    page,
    pageSize,
    keyword,
    setKeyword,
    filterCustomerId,
    filterProjectId,
    setFilterProjectId,
    filterStatus,
    setFilterStatus,
    customerOptions,
    filterProjectOptions: filterProjectsQuery.data ?? [],
    filterProjectsLoading: filterProjectsQuery.isFetching,
    records,
    total,
    listQuery,
    hasListError,
    listErrorMessage,
    selectedRowKeys,
    selectedRows,
    selectedRecord,
    setSelectedRowKeys,
    capabilities,
    editorOpen,
    editorBaseRecord,
    editorProjectOptions: editorProjectsQuery.data ?? [],
    editorProjectsLoading: editorProjectsQuery.isFetching,
    detailContractId,
    setDetailContractId,
    setEditorCustomerId,
    handleFilterCustomerChange,
    handleSearch,
    handleResetFilters,
    handlePageChange,
    handleRefresh,
    openEditor,
    closeEditor,
    handleEditorSaved,
    handleToggleRecordSelected,
    handleRecordDoubleClick,
    handleDeleteSelected,
    handleViewDetailSelected,
    performStatusChange,
    clearSelection,
  }
}
