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
  fetchSettlementCompanyOptions,
  getSettlementCompanyOptions,
} from '@/api/system/company-settings'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { StatusTag } from '@/components/StatusTag'
import {
  normalizeCarrierDraftRecord,
  normalizeCarrierEditorRecord,
} from '@/config/business-pages/master/carrier-vehicle-adapter'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { enabledStatusOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  getMasterOptionQueryKey,
  reloadMasterOptionsForModule,
} from '@/hooks/master-option-cache-refresh'
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

const MODULE_KEY: ModuleKey = 'carrier'
const FALLBACK_PAGE_SIZE = 30
const DEFAULT_HIDDEN_COLUMN_KEYS = ['contactPhone', 'vehicleType', 'remark']

const COLUMN_KEYS = [
  'carrierCode',
  'carrierName',
  'contactName',
  'contactPhone',
  'vehicleType',
  'priceMode',
  'defaultSettlementCompanyName',
  'status',
  'remark',
] as const

type CarrierColumnKey = (typeof COLUMN_KEYS)[number]

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

type CarrierListRow = LegacyModuleRecord

interface CarrierEditorValues {
  carrierCode?: string
  carrierName: string
  contactName?: string
  contactPhone?: string
  vehiclePlate?: string
  vehicleContact?: string
  vehiclePhone?: string
  vehicleRemark?: string
  vehiclePlate2?: string
  vehicleContact2?: string
  vehiclePhone2?: string
  vehicleRemark2?: string
  vehiclePlate3?: string
  vehicleContact3?: string
  vehiclePhone3?: string
  vehicleRemark3?: string
  defaultSettlementCompanyId: EntityId
  defaultSettlementCompanyName?: string
  status: string
  remark?: string
}

const VEHICLE_SLOT_FIELDS = [
  ['vehiclePlate', 'vehicleContact', 'vehiclePhone', 'vehicleRemark'],
  ['vehiclePlate2', 'vehicleContact2', 'vehiclePhone2', 'vehicleRemark2'],
  ['vehiclePlate3', 'vehicleContact3', 'vehiclePhone3', 'vehicleRemark3'],
] as const

function CarrierInlineDetail({ recordId }: { recordId: EntityId }) {
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
    { key: 'carrierCode', label: t('modules.pages.carrier.colCarrierCode') },
    { key: 'carrierName', label: t('modules.pages.carrier.colCarrierName') },
    { key: 'contactName', label: t('modules.pages.carrier.colContactName') },
    { key: 'contactPhone', label: t('modules.pages.carrier.colContactPhone') },
    { key: 'vehiclePlate', label: t('modules.pages.carrier.colVehiclePlate') },
    {
      key: 'vehicleContact',
      label: t('modules.pages.carrier.colVehicleContact'),
    },
    { key: 'vehiclePhone', label: t('modules.pages.carrier.colVehiclePhone') },
    {
      key: 'vehiclePlate2',
      label: t('modules.pages.carrier.colVehiclePlate2'),
    },
    {
      key: 'vehicleContact2',
      label: t('modules.pages.carrier.colVehicleContact2'),
    },
    {
      key: 'vehiclePhone2',
      label: t('modules.pages.carrier.colVehiclePhone2'),
    },
    {
      key: 'vehiclePlate3',
      label: t('modules.pages.carrier.colVehiclePlate3'),
    },
    {
      key: 'vehicleContact3',
      label: t('modules.pages.carrier.colVehicleContact3'),
    },
    {
      key: 'vehiclePhone3',
      label: t('modules.pages.carrier.colVehiclePhone3'),
    },
    { key: 'priceMode', label: t('modules.pages.carrier.colPriceMode') },
    {
      key: 'defaultSettlementCompanyName',
      label: t('modules.pages.carrier.colDefaultSettlementCompany'),
    },
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
                {displayValue(record[field.key])}
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
  const records: CarrierListRow[] = hasListError
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
            reloadMasterOptionsForModule(MODULE_KEY).then((data) => {
              queryClient.setQueryData(masterOptionQueryKey, data)
              return queryClient.invalidateQueries({
                queryKey: masterOptionQueryKey,
              })
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

  const syncCarrierForm = (changed: Record<string, unknown>) => {
    if (Object.hasOwn(changed, 'defaultSettlementCompanyId')) {
      form.setFieldsValue({
        defaultSettlementCompanyName: findSettlementCompanyName(
          changed.defaultSettlementCompanyId,
        ),
      })
    }
  }

  const handleEditorSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const draft: LegacyModuleRecordInput = {
        // 新建时沿用原页面 defaultDraftValues：计价模式默认按吨
        priceMode: '按吨',
        ...(editorBaseRecord ?? {}),
        ...values,
        carrierCode: values.carrierCode ?? '',
        contactName: values.contactName ?? '',
        contactPhone: values.contactPhone ?? '',
        defaultSettlementCompanyId: values.defaultSettlementCompanyId,
        defaultSettlementCompanyName: findSettlementCompanyName(
          values.defaultSettlementCompanyId,
        ),
        status: values.status,
        remark: values.remark ?? '',
      }
      normalizeCarrierDraftRecord(draft)
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

  const columnLabels = useMemo<Record<CarrierColumnKey, string>>(
    () => ({
      carrierCode: t('modules.pages.carrier.colCarrierCode'),
      carrierName: t('modules.pages.carrier.colCarrierName'),
      contactName: t('modules.pages.carrier.colContactName'),
      contactPhone: t('modules.pages.carrier.colContactPhone'),
      vehicleType: t('modules.pages.carrier.colVehicleType'),
      priceMode: t('modules.pages.carrier.colPriceMode'),
      defaultSettlementCompanyName: t(
        'modules.pages.carrier.colDefaultSettlementCompany',
      ),
      status: t('modules.columns.status'),
      remark: t('modules.columns.remark'),
    }),
    [t],
  )

  const columnWidths = useMemo<Record<CarrierColumnKey, number>>(
    () => ({
      carrierCode: 140,
      carrierName: 180,
      contactName: 110,
      contactPhone: 140,
      vehicleType: 120,
      priceMode: 100,
      defaultSettlementCompanyName: 180,
      status: 100,
      remark: 180,
    }),
    [],
  )

  const dataColumns = useMemo(() => {
    return COLUMN_KEYS.filter((key) => !hiddenColumnKeys.includes(key)).map(
      (key): ColumnsType<CarrierListRow>[number] => ({
        title: columnLabels[key],
        dataIndex: key,
        key,
        width: columnWidths[key],
        align: key === 'status' || key === 'priceMode' ? 'center' : undefined,
        ellipsis: true,
        render:
          key === 'status'
            ? (_: unknown, record: CarrierListRow) => (
                <StatusTag
                  status={asString(record.status)}
                  statusMap={statusMap}
                />
              )
            : (_: unknown, record: CarrierListRow) => displayValue(record[key]),
      }),
    )
  }, [columnLabels, columnWidths, hiddenColumnKeys])

  const visibleColumns: ColumnsType<CarrierListRow> = useMemo(
    () => [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: CarrierListRow) => (
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
      title={t('modules.pages.carrier.title')}
      description={t('modules.pages.carrier.description')}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('modules.filter.keyword')}
                allowClear
                placeholder={t('modules.pages.carrier.placeholderKeyword')}
                style={{ width: 240 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
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
              <Table<CarrierListRow>
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
                    <CarrierInlineDetail recordId={String(record.id)} />
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
                  title: t('modules.pages.carrier.title'),
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
              syncCarrierForm(allValues as unknown as Record<string, unknown>)
            }
          >
            <Row gutter={[12, 12]}>
              <Col span={6}>
                <Form.Item
                  name="carrierCode"
                  label={t('modules.pages.carrier.colCarrierCode')}
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
                  name="carrierName"
                  label={t('modules.pages.carrier.colCarrierName')}
                  rules={[
                    {
                      required: true,
                      message: t('modules.formField.inputRequired', {
                        label: t('modules.pages.carrier.colCarrierName'),
                      }),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="contactName"
                  label={t('modules.pages.carrier.colContactName')}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="contactPhone"
                  label={t('modules.pages.carrier.colContactPhone')}
                >
                  <Input />
                </Form.Item>
              </Col>
              {VEHICLE_SLOT_FIELDS.map((slot, slotIndex) => {
                const slotLabels = [
                  slotIndex === 0
                    ? t('modules.pages.carrier.formVehiclePlate')
                    : t(
                        `modules.pages.carrier.formVehiclePlate${slotIndex + 1}`,
                      ),
                  slotIndex === 0
                    ? t('modules.pages.carrier.formVehicleContact')
                    : t(
                        `modules.pages.carrier.formVehicleContact${slotIndex + 1}`,
                      ),
                  slotIndex === 0
                    ? t('modules.pages.carrier.formVehiclePhone')
                    : t(
                        `modules.pages.carrier.formVehiclePhone${slotIndex + 1}`,
                      ),
                  slotIndex === 0
                    ? t('modules.pages.carrier.formVehicleRemark')
                    : t(
                        `modules.pages.carrier.formVehicleRemark${slotIndex + 1}`,
                      ),
                ]
                return slot.map((fieldKey, fieldIndex) => (
                  <Col span={6} key={fieldKey}>
                    <Form.Item name={fieldKey} label={slotLabels[fieldIndex]}>
                      <Input />
                    </Form.Item>
                  </Col>
                ))
              })}
              <Col span={6}>
                <Form.Item
                  name="defaultSettlementCompanyId"
                  label={t('modules.pages.carrier.colDefaultSettlementCompany')}
                  rules={[
                    {
                      required: true,
                      message: t('modules.formField.selectRequired', {
                        label: t(
                          'modules.pages.carrier.colDefaultSettlementCompany',
                        ),
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
                  name="status"
                  label={t('modules.columns.status')}
                  initialValue="正常"
                >
                  <Select options={enabledStatusOptions} />
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
