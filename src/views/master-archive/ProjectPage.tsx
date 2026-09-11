import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Form } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listBusinessModule } from '@/api/business/business-listing'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchSettlementCompanyOptions } from '@/api/system/company-settings'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type { EntityId } from '@/types/entity-id'
import type { LegacyModuleRecord } from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import type { ProjectEditorValues } from './ProjectEditorOverlay'
import { ProjectEditorOverlay } from './ProjectEditorOverlay'
import { ProjectFilterToolbar } from './ProjectFilterToolbar'
import { ProjectTableSection } from './ProjectTableSection'

const MODULE_KEY: ModuleKey = 'project'
const FALLBACK_PAGE_SIZE = 30
const DEFAULT_HIDDEN_COLUMN_KEYS = [
  'projectNameAbbr',
  'projectAddress',
  'remark',
]

type ProjectListRow = LegacyModuleRecord

export function ProjectPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ProjectEditorValues>()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState<
    EntityId | undefined
  >()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(
    DEFAULT_HIDDEN_COLUMN_KEYS,
  )
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBaseRecord, setEditorBaseRecord] =
    useState<ProjectListRow | null>(null)
  const [attachmentRecordId, setAttachmentRecordId] = useState('')

  const { data: runtimeConfig } = useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: 30_000,
  })
  useEffect(() => {
    const value = Number(runtimeConfig?.ui.defaultPageSize)
    if (Number.isFinite(value) && value > 0) {
      setPageSize(Math.floor(value))
    }
  }, [runtimeConfig?.ui.defaultPageSize])

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    staleTime: 300_000,
  })
  const settlementCompanyQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: fetchSettlementCompanyOptions,
    staleTime: 300_000,
  })
  const customerOptions = useMemo(
    () => customerQuery.data ?? [],
    [customerQuery.data],
  )
  const settlementCompanyOptions = settlementCompanyQuery.data ?? []

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.businessGridList(
      MODULE_KEY,
      submittedFilters,
      page,
      pageSize,
    ),
    queryFn: ({ signal }) =>
      listBusinessModule(
        MODULE_KEY,
        submittedFilters,
        { currentPage: page, pageSize },
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
  const records: ProjectListRow[] = useMemo(
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

  const refreshModuleQueries = async () => {
    const masterOptionQueryKey = getMasterOptionQueryKey(MODULE_KEY)
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(MODULE_KEY),
      }),
      ...(masterOptionQueryKey
        ? [
            queryClient.invalidateQueries({ queryKey: masterOptionQueryKey }),
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.masterOptions.projectAbbreviations,
            }),
          ]
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
    applyFilters({
      keyword: keyword.trim() || undefined,
      customerId: filterCustomerId || undefined,
      status: filterStatus || undefined,
    })
  }

  const handleResetFilters = () => {
    setKeyword('')
    setFilterCustomerId(undefined)
    setFilterStatus(undefined)
    applyFilters({})
  }

  const handleRefresh = () => {
    clearSelection()
    void refreshModuleQueries()
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize)
    }
    setPage(nextPage)
    clearSelection()
  }

  const toggleRecordSelection = (record: ProjectListRow) => {
    const recordKey = String(record.id)
    setSelectedRowKeys((previous) =>
      previous.includes(recordKey)
        ? previous.filter((key) => key !== recordKey)
        : [...previous, recordKey],
    )
  }

  const openEditor = (record: ProjectListRow | null) => {
    setExpandedRowKeys([])
    if (record) {
      setEditorBaseRecord({ ...record })
      form.resetFields()
      form.setFieldsValue({
        projectCode: asString(record.projectCode),
        projectName: asString(record.projectName),
        projectNameAbbr: asString(record.projectNameAbbr),
        customerId: asString(record.customerId),
        customerCode: asString(record.customerCode),
        settlementCompanyId: asString(record.settlementCompanyId),
        settlementCompanyName: asString(record.settlementCompanyName),
        projectManager: asString(record.projectManager),
        projectAddress: asString(record.projectAddress),
        status: asString(record.status) || '正常',
        remark: asString(record.remark),
      })
      setEditorOpen(true)
      return
    }
    setEditorBaseRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: '正常', projectCode: '' })
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditorBaseRecord(null)
    form.resetFields()
  }

  const handleEditorSaved = async () => {
    clearSelection()
    await refreshModuleQueries()
  }

  const selectedRecord = selectedRows.length === 1 ? selectedRows[0] : undefined
  const selectedRecordCanEdit = selectedRecord
    ? resolveModuleRecordCapabilities(selectedRecord, MODULE_KEY).canEdit
    : false

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={t('modules.pages.project.title')}
      description={t('modules.pages.project.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <ProjectFilterToolbar
            keyword={keyword}
            onKeywordChange={setKeyword}
            filterCustomerId={filterCustomerId}
            onFilterCustomerIdChange={(value) =>
              setFilterCustomerId(value || undefined)
            }
            customerOptions={customerOptions}
            filterStatus={filterStatus}
            onFilterStatusChange={(value) =>
              setFilterStatus(value || undefined)
            }
            onSearch={handleSearch}
            onResetFilters={handleResetFilters}
            onCreate={() => openEditor(null)}
            submittedFilters={submittedFilters}
            selectedRows={selectedRows}
            onDeleteCompleted={handleEditorSaved}
            selectedRecord={selectedRecord}
            selectedRecordCanEdit={selectedRecordCanEdit}
            onEditSelected={() => openEditor(selectedRecord ?? null)}
            onAttachmentSelected={() => {
              if (selectedRecord) {
                setAttachmentRecordId(String(selectedRecord.id))
              }
            }}
            hiddenColumnKeys={hiddenColumnKeys}
            onToggleColumn={(key) => {
              setHiddenColumnKeys((previous) =>
                previous.includes(key)
                  ? previous.filter((item) => item !== key)
                  : [...previous, key],
              )
            }}
            selectedRowKeysCount={selectedRowKeys.length}
            onClearSelection={clearSelection}
            isFetching={listQuery.isFetching}
            onRefresh={handleRefresh}
          />

          <ProjectTableSection
            records={records}
            selectedRows={selectedRows}
            customerOptions={customerOptions}
            total={total}
            page={page}
            pageSize={pageSize}
            hiddenColumnKeys={hiddenColumnKeys}
            selectedRowKeys={selectedRowKeys}
            expandedRowKeys={expandedRowKeys}
            isLoading={listQuery.isLoading}
            isFetching={listQuery.isFetching}
            hasListError={hasListError}
            errorMessage={listErrorMessage}
            onSelectionChange={(keys) => setSelectedRowKeys(keys.map(String))}
            onExpandedRowKeysChange={setExpandedRowKeys}
            onToggleRecordSelected={toggleRecordSelection}
            onRecordDoubleClick={(record) => {
              if (resolveModuleRecordCapabilities(record, MODULE_KEY).canEdit) {
                openEditor(record)
              }
            }}
            onPageChange={handlePageChange}
            onRetry={() => void listQuery.refetch()}
          />
        </section>

        <ProjectEditorOverlay
          open={editorOpen}
          editorBaseRecord={editorBaseRecord}
          form={form}
          customerOptions={customerOptions}
          settlementCompanyOptions={settlementCompanyOptions}
          onClose={closeEditor}
          onSaved={handleEditorSaved}
        />

        <ModuleAttachmentModal
          open={Boolean(attachmentRecordId)}
          moduleKey={MODULE_KEY}
          recordId={attachmentRecordId}
          onClose={() => setAttachmentRecordId('')}
        />
      </div>
    </AppProPage>
  )
}
