import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useLocation } from '@tanstack/react-router'
import { Form } from 'antd'
import type { Dayjs } from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteProjectOpeningBalance,
  getProjectOpeningBalanceSummary,
  listProjectOpeningBalances,
  type ProjectOpeningBalanceFilterParams,
  type ProjectOpeningBalanceRecord,
  type ProjectOpeningBalanceStatus,
  type ProjectOpeningBalanceType,
  updateProjectOpeningBalanceStatus,
} from '@/api/finance/project-opening-balances'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import {
  fetchAllEnabledProjectOptions,
  type ProjectOption,
} from '@/api/master/project-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'
import { useDefaultPageSize } from '@/hooks/useDefaultPageSize'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import {
  buildOpeningBalanceFormValues,
  type ProjectOpeningBalanceFormValues,
  resolveOpeningBalanceCapabilities,
} from './project-opening-balance-model'

const EMPTY_PROJECTS: ProjectOption[] = []
const EMPTY_RECORDS: ProjectOpeningBalanceRecord[] = []

function readInitialProjectId(search: unknown): string | undefined {
  if (search && typeof search === 'object' && 'projectId' in search) {
    const raw = (search as Record<string, unknown>).projectId
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim()
    }
  }
  return undefined
}

export function useProjectOpeningBalancePage() {
  const { t } = useTranslation()
  const location = useLocation()
  const queryClient = useQueryClient()
  const defaultPageSize = useDefaultPageSize()
  const permissions = useAuthStore((state) => state.user?.permissions)
  const capabilities = useMemo(
    () => resolveOpeningBalanceCapabilities(permissions),
    [permissions],
  )

  const urlProjectId = readInitialProjectId(location.search)
  const [form] = Form.useForm<ProjectOpeningBalanceFormValues>()
  const [page, setPage] = useState(1)
  const [pageSizeOverride, setPageSizeOverride] = useState<{
    base: number
    value: number
  } | null>(null)
  const pageSize =
    pageSizeOverride && pageSizeOverride.base === defaultPageSize
      ? pageSizeOverride.value
      : defaultPageSize

  const [keyword, setKeyword] = useState('')
  const [filterProjectId, setFilterProjectId] = useState<string | undefined>(
    urlProjectId,
  )
  const [filterCustomerId, setFilterCustomerId] = useState<string | undefined>()
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>()
  const [filterBalanceType, setFilterBalanceType] = useState<
    ProjectOpeningBalanceType | undefined
  >()
  const [filterStatus, setFilterStatus] = useState<
    ProjectOpeningBalanceStatus | undefined
  >()
  const [cutoffRange, setCutoffRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null)
  const [submittedFilters, setSubmittedFilters] =
    useState<ProjectOpeningBalanceFilterParams>(() =>
      urlProjectId ? { projectId: urlProjectId } : {},
    )

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<ProjectOpeningBalanceRecord | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  // 从项目资料带 ?projectId=... 深链跳转时，同步更新筛选条件。
  useEffect(() => {
    if (urlProjectId) {
      setFilterProjectId(urlProjectId)
      setSubmittedFilters((prev) =>
        prev.projectId === urlProjectId
          ? prev
          : { ...prev, projectId: urlProjectId },
      )
      setPage(1)
    }
  }, [urlProjectId])

  const { settlementCompanies, isLoading: companiesLoading } = useMasterOptions(
    { settlementCompanies: true },
  )
  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const projectQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.projectBase,
    queryFn: ({ signal }) => fetchAllEnabledProjectOptions(signal),
    staleTime: STALE_MASTER_OPTIONS,
  })
  const projectOptions = projectQuery.data ?? EMPTY_PROJECTS
  const customerNameById = useMemo(
    () =>
      new Map(
        (customerQuery.data ?? []).map((item) => [
          item.id,
          item.customerName || item.label,
        ]),
      ),
    [customerQuery.data],
  )
  const customerSelectOptions = useMemo(
    () =>
      (customerQuery.data ?? []).map((item) => ({
        label: item.customerName || item.label,
        value: item.id,
      })),
    [customerQuery.data],
  )
  const projectSelectOptions = useMemo(
    () =>
      projectOptions.map((item) => ({
        label: item.projectName,
        value: item.id,
      })),
    [projectOptions],
  )

  const listParams = useMemo(
    () => ({
      ...submittedFilters,
      page: page - 1,
      size: pageSize,
    }),
    [submittedFilters, page, pageSize],
  )

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.projectOpeningBalances(listParams),
    queryFn: ({ signal }) => listProjectOpeningBalances(listParams, signal),
    placeholderData: keepPreviousData,
  })
  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.projectOpeningBalancesSummary(submittedFilters),
    queryFn: ({ signal }) =>
      getProjectOpeningBalanceSummary(submittedFilters, signal),
    placeholderData: keepPreviousData,
  })

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.projectOpeningBalancesBase,
      }),
      queryClient.invalidateQueries({ queryKey: ['finance-overview'] }),
    ])
  }, [queryClient])

  const handleSearch = () => {
    setPage(1)
    setSubmittedFilters({
      ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      ...(filterProjectId ? { projectId: filterProjectId } : {}),
      ...(filterCustomerId ? { customerId: filterCustomerId } : {}),
      ...(filterCompanyId ? { settlementCompanyId: filterCompanyId } : {}),
      ...(filterBalanceType ? { balanceType: filterBalanceType } : {}),
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(cutoffRange?.[0]
        ? { startDate: cutoffRange[0].format('YYYY-MM-DD') }
        : {}),
      ...(cutoffRange?.[1]
        ? { endDate: cutoffRange[1].format('YYYY-MM-DD') }
        : {}),
    })
  }

  const handleReset = () => {
    setKeyword('')
    setFilterProjectId(undefined)
    setFilterCustomerId(undefined)
    setFilterCompanyId(undefined)
    setFilterBalanceType(undefined)
    setFilterStatus(undefined)
    setCutoffRange(null)
    setPage(1)
    setSubmittedFilters({})
  }

  const openEditor = useCallback(
    (record: ProjectOpeningBalanceRecord | null) => {
      setEditingRecord(record)
      form.setFieldsValue(
        buildOpeningBalanceFormValues(record, filterProjectId),
      )
      setEditorOpen(true)
    },
    [filterProjectId, form],
  )

  const handleStatusChange = useCallback(
    async (
      record: ProjectOpeningBalanceRecord,
      nextStatus: ProjectOpeningBalanceStatus,
    ) => {
      setMutatingId(record.id)
      try {
        await updateProjectOpeningBalanceStatus(record.id, nextStatus)
        message.success(
          nextStatus === 'CONFIRMED'
            ? t('openingBalance.confirmSuccess')
            : t('openingBalance.unlockSuccess'),
        )
        await invalidateAll()
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t('openingBalance.operationFailed'),
        )
      }
      setMutatingId(null)
    },
    [invalidateAll, t],
  )

  const handleDelete = useCallback(
    async (record: ProjectOpeningBalanceRecord) => {
      setMutatingId(record.id)
      try {
        await deleteProjectOpeningBalance(record.id)
        message.success(t('common.deleteSuccess'))
        await invalidateAll()
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t('openingBalance.deleteFailed'),
        )
      }
      setMutatingId(null)
    },
    [invalidateAll, t],
  )

  const handlePageChange = (nextPage: number, nextSize: number) => {
    setPage(nextPage)
    if (nextSize !== pageSize) {
      setPageSizeOverride({ base: defaultPageSize, value: nextSize })
    }
  }

  return {
    form,
    capabilities,
    page,
    pageSize,
    keyword,
    setKeyword,
    filterProjectId,
    setFilterProjectId,
    filterCustomerId,
    setFilterCustomerId,
    filterCompanyId,
    setFilterCompanyId,
    filterBalanceType,
    setFilterBalanceType,
    filterStatus,
    setFilterStatus,
    cutoffRange,
    setCutoffRange,
    editorOpen,
    setEditorOpen,
    editingRecord,
    mutatingId,
    settlementCompanies,
    companiesLoading,
    customerQuery,
    projectQuery,
    projectOptions,
    customerNameById,
    customerSelectOptions,
    projectSelectOptions,
    listQuery,
    summaryQuery,
    records: listQuery.data?.content ?? EMPTY_RECORDS,
    total: listQuery.data?.totalElements ?? 0,
    summary: summaryQuery.data,
    invalidateAll,
    handleSearch,
    handleReset,
    openEditor,
    handleStatusChange,
    handleDelete,
    handlePageChange,
  }
}
