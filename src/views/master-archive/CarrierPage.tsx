import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { Form } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listBusinessModule } from '@/api/business/business-listing'
import { fetchSettlementCompanyOptions } from '@/api/system/company-settings'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { normalizeCarrierEditorRecord } from '@/config/business-pages/master/carrier-vehicle-adapter'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getMasterOptionQueryKey,
  reloadMasterOptionsForModule,
} from '@/hooks/master-option-cache-refresh'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type { LegacyModuleRecord } from '@/types/module-record'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import type { CarrierEditorValues } from './CarrierEditorOverlay'
import { CarrierEditorOverlay } from './CarrierEditorOverlay'
import { CarrierFilterToolbar } from './CarrierFilterToolbar'
import { CarrierTableSection } from './CarrierTableSection'

const MODULE_KEY: ModuleKey = 'carrier'
const FALLBACK_PAGE_SIZE = 30
const DEFAULT_HIDDEN_COLUMN_KEYS = ['contactPhone', 'vehicleType', 'remark']

type CarrierListRow = LegacyModuleRecord

export function CarrierPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<CarrierEditorValues>()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(FALLBACK_PAGE_SIZE)
  const [keyword, setKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [submittedFilters, setSubmittedFilters] = useState<SearchParams>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>(
    DEFAULT_HIDDEN_COLUMN_KEYS,
  )
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorBaseRecord, setEditorBaseRecord] =
    useState<CarrierListRow | null>(null)
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

  const settlementCompanyQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.settlementCompany,
    queryFn: fetchSettlementCompanyOptions,
    staleTime: 300_000,
  })
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
  const records: CarrierListRow[] = useMemo(
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
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(MODULE_KEY),
      }),
      ...(getMasterOptionQueryKey(MODULE_KEY)
        ? [reloadMasterOptionsForModule(MODULE_KEY).then(() => undefined)]
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
      status: filterStatus || undefined,
    })
  }

  const handleResetFilters = () => {
    setKeyword('')
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

  const toggleRecordSelection = (record: CarrierListRow) => {
    const recordKey = String(record.id)
    setSelectedRowKeys((previous) =>
      previous.includes(recordKey)
        ? previous.filter((key) => key !== recordKey)
        : [...previous, recordKey],
    )
  }

  const openEditor = (record: CarrierListRow | null) => {
    setExpandedRowKeys([])
    if (record) {
      const normalized = normalizeCarrierEditorRecord({ ...record })
      setEditorBaseRecord(normalized as LegacyModuleRecord)
      form.resetFields()
      form.setFieldsValue(normalized as unknown as Record<string, unknown>)
      setEditorOpen(true)
      return
    }
    setEditorBaseRecord(null)
    form.resetFields()
    form.setFieldsValue({ status: '正常', carrierCode: '' })
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
      title={t('modules.pages.carrier.title')}
      description={t('modules.pages.carrier.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <CarrierFilterToolbar
            keyword={keyword}
            onKeywordChange={setKeyword}
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

          <CarrierTableSection
            records={records}
            selectedRows={selectedRows}
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

        <CarrierEditorOverlay
          open={editorOpen}
          editorBaseRecord={editorBaseRecord}
          form={form}
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
