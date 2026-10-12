import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Form } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listBusinessModule } from '@/api/business/business-listing'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchSettlementCompanyOptions } from '@/api/system/company-settings'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { ColumnSettingsRequestContext } from '@/components/column-settings-request-context'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_LONG,
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type { EntityId } from '@/types/entity-id'
import type { LegacyModuleRecord } from '@/types/module-record'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import type { ProjectEditorValues } from './ProjectEditorOverlay'
import { ProjectEditorOverlay } from './ProjectEditorOverlay'
import { ProjectFilterToolbar } from './ProjectFilterToolbar'
import { ProjectTableSection } from './ProjectTableSection'
import { useProjectColumnVisibility } from './useProjectColumnVisibility'
import { useProjectEditor } from './useProjectEditor'

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
  // 用户显式改过每页条数才记 override: 运行配置晚到不会覆盖用户选择,
  // 也因此不需要「effect 里 setState」——那种写法会多渲染一次（react-hooks-js/set-state-in-effect）。
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [filterCustomerId, setFilterCustomerId] = useState<
    EntityId | undefined
  >()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [attachmentRecordId, setAttachmentRecordId] = useState('')
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)

  const { data: runtimeConfig } = useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: STALE_LONG,
  })
  const configuredPageSize = Number(runtimeConfig?.ui.defaultPageSize)
  const defaultPageSize =
    Number.isFinite(configuredPageSize) && configuredPageSize > 0
      ? Math.floor(configuredPageSize)
      : FALLBACK_PAGE_SIZE
  const pageSize = pageSizeOverride ?? defaultPageSize

  const customerQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.customer,
    queryFn: fetchCustomerOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const settlementCompanyQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: ({ signal }) => fetchSettlementCompanyOptions(signal),
    staleTime: STALE_MASTER_OPTIONS,
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

  const { hiddenColumnKeys, toggleColumn, hideColumn } =
    useProjectColumnVisibility(DEFAULT_HIDDEN_COLUMN_KEYS)

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
      setPageSizeOverride(nextPageSize)
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

  const {
    editorOpen,
    editorBaseRecord,
    openEditor,
    closeEditor,
    handleEditorSaved,
  } = useProjectEditor({
    form,
    collapseExpandedRows: () => setExpandedRowKeys([]),
    clearSelection,
    refreshModuleQueries,
  })

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
          {/* 列头右键菜单的「列设置…」复用工具栏这个弹层(开合状态在本组件) */}
          <ColumnSettingsRequestContext.Provider
            value={() => setColumnSettingsOpen(true)}
          >
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
              onToggleColumn={toggleColumn}
              selectedRowKeysCount={selectedRowKeys.length}
              onClearSelection={clearSelection}
              isFetching={listQuery.isFetching}
              onRefresh={handleRefresh}
              columnSettingsOpen={columnSettingsOpen}
              onColumnSettingsOpenChange={setColumnSettingsOpen}
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
                if (
                  resolveModuleRecordCapabilities(record, MODULE_KEY).canEdit
                ) {
                  openEditor(record)
                }
              }}
              onPageChange={handlePageChange}
              onRetry={() => void listQuery.refetch()}
              onHideColumn={hideColumn}
            />
          </ColumnSettingsRequestContext.Provider>
        </section>

        <ProjectEditorOverlay
          open={editorOpen}
          editorBaseRecord={editorBaseRecord}
          form={form}
          customerOptions={customerOptions}
          quoteRegions={runtimeConfig?.business?.quoteRegions}
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
