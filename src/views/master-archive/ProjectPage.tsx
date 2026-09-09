import {
  DownloadOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  Dropdown,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { exportModuleData } from '@/api/business/common-export'
import {
  fetchCustomerOptions,
  getCustomerOptions,
} from '@/api/master/customer-options'
import {
  fetchSettlementCompanyOptions,
  getSettlementCompanyOptions,
} from '@/api/system/company-settings'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { StatusTag } from '@/components/StatusTag'
import { resolveProjectCustomerDisplay } from '@/config/business-pages/master/project-page-utils'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { enabledStatusOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import type { ModuleKey } from '@/module-system/core/module-key'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type { EntityId } from '@/types/entity-id'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'

const MODULE_KEY: ModuleKey = 'project'
const FALLBACK_PAGE_SIZE = 30
const DEFAULT_HIDDEN_COLUMN_KEYS = [
  'projectNameAbbr',
  'projectAddress',
  'remark',
]

const COLUMN_KEYS = [
  'projectCode',
  'projectName',
  'projectNameAbbr',
  'customerCode',
  'settlementCompanyName',
  'projectManager',
  'projectAddress',
  'status',
  'remark',
] as const

type ProjectColumnKey = (typeof COLUMN_KEYS)[number]

function displayValue(value: unknown): string {
  const normalized = asString(value).trim()
  return normalized || '-'
}

function findSettlementCompanyName(id: unknown, fallback = ''): string {
  const normalizedId = asString(id).trim()
  if (!normalizedId) {
    return ''
  }
  return (
    getSettlementCompanyOptions().find(
      (option) => asString(option.value).trim() === normalizedId,
    )?.companyName || fallback
  )
}

type ProjectListRow = LegacyModuleRecord

interface ProjectEditorValues {
  projectCode?: string
  projectName: string
  projectNameAbbr?: string
  customerId: EntityId
  customerCode?: string
  settlementCompanyId: EntityId
  settlementCompanyName?: string
  projectManager?: string
  projectAddress?: string
  status: string
  remark?: string
}

function ProjectInlineDetail({ recordId }: { recordId: EntityId }) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: ['business-grid', MODULE_KEY, 'detail', recordId],
    queryFn: () => getBusinessModuleDetail(MODULE_KEY, recordId),
    enabled: Boolean(recordId),
    staleTime: 5_000,
  })

  if (detail.isLoading) {
    return (
      <div className="module-record-detail-inline-state">
        <Spin size="small" />
      </div>
    )
  }
  if (detail.error != null) {
    return (
      <div className="module-record-detail-inline-state">
        <Alert
          type="error"
          showIcon
          title={t('api.loadFailed')}
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => void detail.refetch()}
            >
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      </div>
    )
  }
  const record: LegacyModuleRecord | undefined = detail.data
  if (!record) {
    return (
      <div className="module-record-detail-inline module-record-detail-inline-fields">
        <Alert type="info" showIcon title={t('modules.detail.noData')} />
      </div>
    )
  }

  const detailRows: Array<{ key: string; label: string }> = [
    { key: 'projectCode', label: t('modules.pages.project.projectCode') },
    { key: 'projectName', label: t('modules.pages.project.projectName') },
    {
      key: 'projectNameAbbr',
      label: t('modules.pages.project.projectNameAbbr'),
    },
    { key: 'customerCode', label: t('modules.pages.project.customer') },
    {
      key: 'settlementCompanyName',
      label: t('modules.pages.project.settlementCompany'),
    },
    {
      key: 'projectManager',
      label: t('modules.pages.project.projectManager'),
    },
    { key: 'projectAddress', label: t('modules.pages.project.projectAddress') },
    { key: 'remark', label: t('modules.columns.remark') },
  ]

  return (
    <div className="module-record-detail-inline module-record-detail-inline-fields">
      <Row gutter={[12, 12]}>
        {detailRows.map((field) => (
          <Col key={field.key} span={6}>
            <div className="bill-detail-item">
              <span className="bill-detail-label">{field.label}</span>
              <span className="bill-detail-value">
                {field.key === 'customerCode'
                  ? resolveProjectCustomerDisplay(record, getCustomerOptions())
                  : displayValue(record[field.key])}
              </span>
            </div>
          </Col>
        ))}
        <Col span={6}>
          <div className="bill-detail-item">
            <span className="bill-detail-label">
              {t('modules.columns.status')}
            </span>
            <span className="bill-detail-value">
              <StatusTag
                status={asString(record.status)}
                statusMap={statusMap}
              />
            </span>
          </div>
        </Col>
      </Row>
    </div>
  )
}

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
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
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
  const customerOptions = customerQuery.data ?? []
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
  const records: ProjectListRow[] = hasListError
    ? []
    : (listQuery.data?.data?.rows ?? [])
  const total = hasListError ? 0 : (listQuery.data?.data?.total ?? 0)

  const selectedRows = useMemo(
    () => records.filter((row) => selectedRowKeys.includes(String(row.id))),
    [records, selectedRowKeys],
  )

  const refreshModuleQueries = async () => {
    const masterOptionQueryKey = getMasterOptionQueryKey(MODULE_KEY)
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGrid(MODULE_KEY),
      }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.businessGridAll(MODULE_KEY),
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

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportModuleData(MODULE_KEY, submittedFilters)
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

  const syncProjectForm = (changed: Record<string, unknown>) => {
    if (Object.hasOwn(changed, 'customerId')) {
      const nextCustomerId = asString(changed.customerId).trim()
      if (!nextCustomerId) {
        form.setFieldsValue({
          customerId: '',
          customerCode: '',
          settlementCompanyId: '',
          settlementCompanyName: '',
        })
      } else {
        const customer = customerOptions.find(
          (option) => option.id === nextCustomerId,
        )
        if (customer) {
          form.setFieldsValue({
            customerId: customer.id,
            customerCode: asString(customer.customerCode).trim(),
            settlementCompanyId: customer.defaultSettlementCompanyId ?? '',
            settlementCompanyName: asString(
              customer.defaultSettlementCompanyName,
            ),
          })
        }
      }
    }
    if (Object.hasOwn(changed, 'settlementCompanyId')) {
      form.setFieldsValue({
        settlementCompanyName: findSettlementCompanyName(
          changed.settlementCompanyId,
          asString(form.getFieldValue('settlementCompanyName')),
        ),
      })
    }
  }

  const handleEditorSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const customer = values.customerId
        ? customerOptions.find((option) => option.id === values.customerId)
        : undefined
      const draft: LegacyModuleRecordInput = {
        ...(editorBaseRecord ?? {}),
        projectCode: values.projectCode ?? '',
        projectName: values.projectName,
        projectNameAbbr: values.projectNameAbbr ?? '',
        customerId: values.customerId,
        customerCode: customer ? asString(customer.customerCode).trim() : '',
        settlementCompanyId: values.settlementCompanyId,
        settlementCompanyName: findSettlementCompanyName(
          values.settlementCompanyId,
          asString(values.settlementCompanyName),
        ),
        projectManager: values.projectManager ?? '',
        projectAddress: values.projectAddress ?? '',
        status: values.status,
        remark: values.remark ?? '',
      }
      await saveBusinessModule(MODULE_KEY, draft)
      message.success(t('modules.saveResult.success'))
      closeEditor()
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
      (record) => resolveModuleRecordCapabilities(record, MODULE_KEY).canDelete,
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
            deleteBusinessModule(MODULE_KEY, String(record.id)),
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
        clearSelection()
        await refreshModuleQueries()
      },
    })
  }

  const selectedRecord = selectedRows.length === 1 ? selectedRows[0] : undefined
  const selectedRecordCanEdit = selectedRecord
    ? resolveModuleRecordCapabilities(selectedRecord, MODULE_KEY).canEdit
    : false

  const overviewItems = useMemo(() => {
    const rows = selectedRows.length ? selectedRows : records
    return [
      {
        label: t('modules.overview.masterDataCount'),
        value: String(rows.length),
      },
      {
        label: t('modules.overview.normalCount'),
        value: String(
          rows.filter((row) => asString(row.status) === '正常').length,
        ),
      },
    ]
  }, [records, selectedRows, t])

  const columnLabels = useMemo<Record<ProjectColumnKey, string>>(
    () => ({
      projectCode: t('modules.pages.project.projectCode'),
      projectName: t('modules.pages.project.projectName'),
      projectNameAbbr: t('modules.pages.project.projectNameAbbr'),
      customerCode: t('modules.pages.project.customer'),
      settlementCompanyName: t('modules.pages.project.settlementCompany'),
      projectManager: t('modules.pages.project.projectManager'),
      projectAddress: t('modules.pages.project.projectAddress'),
      status: t('modules.columns.status'),
      remark: t('modules.columns.remark'),
    }),
    [t],
  )

  const columnWidths = useMemo<Record<ProjectColumnKey, number>>(
    () => ({
      projectCode: 140,
      projectName: 200,
      projectNameAbbr: 140,
      customerCode: 180,
      settlementCompanyName: 180,
      projectManager: 140,
      projectAddress: 220,
      status: 100,
      remark: 180,
    }),
    [],
  )

  const dataColumns = useMemo(() => {
    const renderers: Record<ProjectColumnKey, (row: ProjectListRow) => string> =
      {
        projectCode: (row) => displayValue(row.projectCode),
        projectName: (row) => displayValue(row.projectName),
        projectNameAbbr: (row) => displayValue(row.projectNameAbbr),
        customerCode: (row) =>
          resolveProjectCustomerDisplay(row, customerOptions),
        settlementCompanyName: (row) => displayValue(row.settlementCompanyName),
        projectManager: (row) => displayValue(row.projectManager),
        projectAddress: (row) => displayValue(row.projectAddress),
        status: () => '',
        remark: (row) => displayValue(row.remark),
      }
    return COLUMN_KEYS.filter((key) => !hiddenColumnKeys.includes(key)).map(
      (key): ColumnsType<ProjectListRow>[number] => ({
        title: columnLabels[key],
        dataIndex: key,
        key,
        width: columnWidths[key],
        align: key === 'status' ? 'center' : undefined,
        ellipsis: true,
        render:
          key === 'status'
            ? (_: unknown, record: ProjectListRow) => (
                <StatusTag
                  status={asString(record.status)}
                  statusMap={statusMap}
                />
              )
            : (_: unknown, record: ProjectListRow) => renderers[key](record),
      }),
    )
  }, [columnLabels, columnWidths, customerOptions, hiddenColumnKeys])

  const visibleColumns: ColumnsType<ProjectListRow> = useMemo(
    () => [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: ProjectListRow) => (
          <Tooltip title={t('hooks.gridColumns.detail')}>
            <Button
              aria-label={t('hooks.gridColumns.detail')}
              className="table-detail-toggle-btn"
              icon={<EyeOutlined />}
              size="small"
              type="text"
              onClick={(event) => {
                event.stopPropagation()
                const recordKey = String(record.id)
                setExpandedRowKeys((previous) =>
                  previous.includes(recordKey)
                    ? previous.filter((key) => key !== recordKey)
                    : [...previous, recordKey],
                )
              }}
            />
          </Tooltip>
        ),
      },
      ...dataColumns,
    ],
    [dataColumns, t],
  )

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={t('modules.pages.project.title')}
      description={t('modules.pages.project.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('modules.filter.keyword')}
                allowClear
                placeholder={t('modules.pages.project.placeholderKeyword')}
                style={{ width: 240 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
              />
              <Select
                aria-label={t('modules.pages.project.customer')}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t('modules.pages.project.customer')}
                style={{ width: 200 }}
                value={filterCustomerId}
                onChange={(value) => setFilterCustomerId(value || undefined)}
                options={customerOptions.map((option) => ({
                  label: option.customerName || option.label,
                  value: option.id,
                }))}
              />
              <Select
                aria-label={t('modules.filter.status')}
                allowClear
                placeholder={t('modules.filter.status')}
                style={{ width: 140 }}
                value={filterStatus}
                onChange={(value) => setFilterStatus(value || undefined)}
                options={enabledStatusOptions}
              />
              <Button type="primary" onClick={handleSearch}>
                {t('common.search')}
              </Button>
              <Button onClick={handleResetFilters}>{t('common.reset')}</Button>
            </Space>
          </div>

          <div className="module-grid-command-region">
            <div className="module-table-toolbar">
              <Space wrap className="module-table-actions">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openEditor(null)}
                >
                  {t('common.create')}
                </Button>
                {selectedRows.length ? (
                  <Button danger onClick={handleDeleteSelected}>
                    {t('hooks.toolbarActions.delete')}
                  </Button>
                ) : null}
                {selectedRecord && selectedRecordCanEdit ? (
                  <Button onClick={() => openEditor(selectedRecord)}>
                    {t('hooks.recordActions.edit')}
                  </Button>
                ) : null}
                {selectedRecord ? (
                  <Button
                    onClick={() =>
                      setAttachmentRecordId(String(selectedRecord.id))
                    }
                  >
                    {t('hooks.recordActions.attachment')}
                  </Button>
                ) : null}
                <Button
                  icon={<DownloadOutlined />}
                  loading={exporting}
                  onClick={() => void handleExport()}
                >
                  {t('common.export')}
                </Button>
                <Dropdown
                  menu={{
                    multiple: true,
                    selectedKeys: COLUMN_KEYS.filter(
                      (key) => !hiddenColumnKeys.includes(key),
                    ),
                    onClick: ({ key }) => {
                      setHiddenColumnKeys((previous) =>
                        previous.includes(key)
                          ? previous.filter((item) => item !== key)
                          : [...previous, key],
                      )
                    },
                    items: COLUMN_KEYS.map((key) => ({
                      key,
                      label: columnLabels[key],
                    })),
                  }}
                >
                  <Button>{t('common.columnSettings')}</Button>
                </Dropdown>
              </Space>
              <div className="module-table-utilities">
                {selectedRowKeys.length ? (
                  <>
                    <span
                      className="module-table-selected-count"
                      aria-live="polite"
                    >
                      {t('common.selected', { count: selectedRowKeys.length })}
                    </span>
                    <Tooltip title={t('common.clearSelection')}>
                      <Button
                        size="small"
                        type="text"
                        className="module-table-clear-selection-button"
                        aria-label={t('common.clearSelection')}
                        onClick={clearSelection}
                      >
                        ✕
                      </Button>
                    </Tooltip>
                  </>
                ) : null}
                <Tooltip title={t('common.refresh')}>
                  <Button
                    type="text"
                    className="module-table-refresh-button"
                    aria-label={t('common.refresh')}
                    icon={<ReloadOutlined />}
                    loading={listQuery.isFetching}
                    onClick={handleRefresh}
                  />
                </Tooltip>
              </div>
            </div>
          </div>

          {hasListError ? (
            <Alert
              type="error"
              showIcon
              title={listErrorMessage || t('api.loadFailed')}
              className="module-grid-warning"
              action={
                <Button
                  size="small"
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={listQuery.isFetching}
                  onClick={() => void listQuery.refetch()}
                >
                  {t('errorBoundary.retry')}
                </Button>
              }
            />
          ) : (
            <>
              <Table<ProjectListRow>
                rowKey={(record) => String(record.id)}
                columns={visibleColumns}
                dataSource={records}
                loading={listQuery.isLoading || listQuery.isFetching}
                pagination={false}
                rowSelection={{
                  selectedRowKeys,
                  preserveSelectedRowKeys: true,
                  onChange: (keys) => setSelectedRowKeys(keys.map(String)),
                }}
                rowClassName={(record) =>
                  asString(record.status) === '禁用' ? 'table-row-emphasis' : ''
                }
                expandable={{
                  expandedRowKeys,
                  showExpandColumn: false,
                  expandedRowRender: (record) => (
                    <ProjectInlineDetail recordId={String(record.id)} />
                  ),
                  onExpand: (expanded, record) => {
                    const recordKey = String(record.id)
                    setExpandedRowKeys((previous) =>
                      expanded
                        ? [...previous, recordKey]
                        : previous.filter((key) => key !== recordKey),
                    )
                  },
                }}
                onRow={(record) => ({
                  onClick: () => toggleRecordSelection(record),
                  onDoubleClick: () => {
                    if (
                      resolveModuleRecordCapabilities(record, MODULE_KEY)
                        .canEdit
                    ) {
                      openEditor(record)
                    }
                  },
                })}
                scroll={{ x: 'max-content' }}
              />
              <ModuleTablePagination
                total={total}
                currentPage={page}
                pageSize={pageSize}
                currentItemCount={records.length}
                overviewItems={overviewItems}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>

        <WorkspaceOverlay
          open={editorOpen}
          title={
            <Space size={8}>
              <span>
                {t('modules.editor.title', {
                  mode: editorBaseRecord
                    ? t('modules.editor.edit')
                    : t('modules.editor.create'),
                  title: t('modules.pages.project.title'),
                })}
              </span>
            </Space>
          }
          onClose={closeEditor}
        >
          <Form
            form={form}
            layout="vertical"
            disabled={saving}
            onValuesChange={(_, allValues) =>
              syncProjectForm(allValues as unknown as Record<string, unknown>)
            }
          >
            <Row gutter={[12, 12]}>
              <Col span={6}>
                <Form.Item
                  name="projectCode"
                  label={t('modules.pages.project.projectCode')}
                  initialValue=""
                >
                  <Input
                    disabled
                    placeholder={t(
                      'modules.editorWorkspace.autoGeneratedPlaceholder',
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="projectName"
                  label={t('modules.pages.project.projectName')}
                  rules={[
                    {
                      required: true,
                      message: t('modules.formField.inputRequired', {
                        label: t('modules.pages.project.projectName'),
                      }),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="projectNameAbbr"
                  label={t('modules.pages.project.projectNameAbbr')}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="customerId"
                  label={t('modules.pages.project.customer')}
                  rules={[
                    {
                      required: true,
                      message: t('modules.formField.selectRequired', {
                        label: t('modules.pages.project.customer'),
                      }),
                    },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={customerOptions.map((option) => ({
                      label: option.customerName || option.label,
                      value: option.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="settlementCompanyId"
                  label={t('modules.pages.project.settlementCompany')}
                  rules={[
                    {
                      required: true,
                      message: t('modules.formField.selectRequired', {
                        label: t('modules.pages.project.settlementCompany'),
                      }),
                    },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    options={settlementCompanyOptions.map((option) => ({
                      label: option.companyName || option.label,
                      value: option.id,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="projectManager"
                  label={t('modules.pages.project.projectManager')}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="status"
                  label={t('modules.columns.status')}
                  initialValue="正常"
                >
                  <Select options={enabledStatusOptions} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="projectAddress"
                  label={t('modules.pages.project.projectAddress')}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="remark" label={t('modules.columns.remark')}>
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          <div className="workspace-overlay-footer">
            <Space>
              <Button onClick={closeEditor}>{t('common.cancel')}</Button>
              <Button
                type="primary"
                loading={saving}
                onClick={() => void handleEditorSave()}
              >
                {t('common.save')}
              </Button>
            </Space>
          </div>
        </WorkspaceOverlay>

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
