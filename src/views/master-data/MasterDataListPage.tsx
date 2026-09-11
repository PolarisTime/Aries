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
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Key, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { exportModuleData } from '@/api/business/common-export'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { AppProPage } from '@/components/AppProPage'
import { StatusTag } from '@/components/StatusTag'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getMasterOptionQueryKey } from '@/hooks/master-option-cache-refresh'
import { resolveModuleRecordCapabilities } from '@/module-system/record/module-record-capabilities'
import type { SearchParams } from '@/types/api-raw'
import type {
  LegacyModuleRecord,
  LegacyModuleRecordInput,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { ModuleAttachmentModal } from '@/views/modules/components/ModuleAttachmentModal'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import type {
  MasterDataPageSpec,
  MasterFormFieldSpec,
  MasterFormValues,
} from './master-data-types'

const FALLBACK_PAGE_SIZE = 30

function renderValue(value: unknown): ReactNode {
  const text = asString(value).trim()
  return text || '-'
}

function MasterInlineDetail({
  spec,
  recordId,
}: {
  spec: MasterDataPageSpec
  recordId: string
}) {
  const { t } = useTranslation()
  const detail = useQuery({
    queryKey: ['business-grid', spec.moduleKey, 'detail', recordId],
    queryFn: () => getBusinessModuleDetail(spec.moduleKey, recordId),
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
  return (
    <div className="module-record-detail-inline module-record-detail-inline-fields">
      <Row gutter={[12, 12]}>
        {spec.detailFields.map((field) => (
          <Col key={field.key} span={6}>
            <div className="bill-detail-item">
              <span className="bill-detail-label">{field.label}</span>
              <span className="bill-detail-value">
                {field.status ? (
                  <StatusTag
                    status={asString(record[field.key])}
                    statusMap={statusMap}
                  />
                ) : field.render ? (
                  field.render(record)
                ) : (
                  renderValue(record[field.key])
                )}
              </span>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}

function buildDefaultOverview(
  spec: MasterDataPageSpec,
  rows: LegacyModuleRecord[],
  selected: LegacyModuleRecord[],
  t: (key: string) => string,
) {
  if (spec.overview) {
    return spec.overview(rows, selected)
  }
  const target = selected.length ? selected : rows
  return [
    {
      label: t('modules.overview.masterDataCount'),
      value: String(target.length),
    },
    {
      label: t('modules.overview.normalCount'),
      value: String(
        target.filter((row) => asString(row.status) === '正常').length,
      ),
    },
  ]
}

export function MasterDataListPage({ spec }: { spec: MasterDataPageSpec }) {
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

  const hiddenKeySet = useMemo(
    () => new Set(hiddenColumnKeys),
    [hiddenColumnKeys],
  )
  const visibleColumns: ColumnsType<LegacyModuleRecord> = useMemo(() => {
    const dataColumns: ColumnsType<LegacyModuleRecord> = spec.columns
      .filter((column) => !hiddenKeySet.has(column.key))
      .map((column) => ({
        title: column.title,
        dataIndex: column.key,
        key: column.key,
        width: column.width,
        align: column.align,
        ellipsis: true,
        render:
          column.status || column.render
            ? (_: unknown, record: LegacyModuleRecord) =>
                column.status ? (
                  <StatusTag
                    status={asString(record[column.key])}
                    statusMap={statusMap}
                  />
                ) : (
                  column.render?.(record)
                )
            : (_: unknown, record: LegacyModuleRecord) =>
                renderValue(record[column.key]),
      }))
    return [
      {
        key: 'detail-toggle',
        title: '',
        width: 48,
        align: 'center',
        render: (_: unknown, record: LegacyModuleRecord) => (
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
    ]
  }, [spec.columns, hiddenKeySet, t])

  const overviewItems = useMemo(
    () => buildDefaultOverview(spec, records, selectedRows, t),
    [spec, records, selectedRows, t],
  )

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={spec.title}
      description={spec.description}
    >
      <div className="page-stack module-page-stack">
        <section className="module-grid-workspace">
          <div className="module-grid-filter-region">
            <Space wrap>
              <Input
                aria-label={t('modules.filter.keyword')}
                allowClear
                placeholder={spec.keywordPlaceholder}
                style={{ width: 240 }}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onPressEnter={handleSearch}
              />
              {spec.filters.map((filter) =>
                filter.type === 'select' ? (
                  <Select
                    key={filter.key}
                    aria-label={filter.placeholder}
                    allowClear
                    placeholder={filter.placeholder}
                    style={{ width: filter.width ?? 160 }}
                    value={filterValues[filter.key] as string | undefined}
                    onChange={(value) =>
                      setFilterValues((previous) => ({
                        ...previous,
                        [filter.key]: value || undefined,
                      }))
                    }
                    options={filter.options}
                  />
                ) : (
                  <Input
                    key={filter.key}
                    aria-label={filter.placeholder}
                    allowClear
                    placeholder={filter.placeholder}
                    style={{ width: filter.width ?? 200 }}
                    value={(filterValues[filter.key] as string) ?? ''}
                    onChange={(event) =>
                      setFilterValues((previous) => ({
                        ...previous,
                        [filter.key]: event.target.value || undefined,
                      }))
                    }
                    onPressEnter={handleSearch}
                  />
                ),
              )}
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
                {singleSelected && singleCanEdit ? (
                  <Button onClick={() => openEditor(singleSelected)}>
                    {t('hooks.recordActions.edit')}
                  </Button>
                ) : null}
                {singleSelected ? (
                  <Button
                    onClick={() =>
                      setAttachmentRecordId(String(singleSelected.id))
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
                    selectedKeys: spec.columns
                      .map((column) => column.key)
                      .filter((key) => !hiddenColumnKeys.includes(key)),
                    onClick: ({ key }) => {
                      setHiddenColumnKeys((previous) =>
                        previous.includes(key)
                          ? previous.filter((item) => item !== key)
                          : [...previous, key],
                      )
                    },
                    items: spec.columns.map((column) => ({
                      key: column.key,
                      label: column.title,
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
              <Table<LegacyModuleRecord>
                rowKey={(record) => String(record.id)}
                columns={visibleColumns}
                dataSource={records}
                loading={listQuery.isLoading || listQuery.isFetching}
                pagination={false}
                rowSelection={{
                  selectedRowKeys,
                  preserveSelectedRowKeys: true,
                  onChange: (keys: Key[]) =>
                    setSelectedRowKeys(keys.map(String)),
                }}
                rowClassName={(record) =>
                  (spec.rowHighlightStatuses ?? []).includes(
                    asString(record.status),
                  )
                    ? 'table-row-emphasis'
                    : ''
                }
                expandable={{
                  expandedRowKeys,
                  showExpandColumn: false,
                  expandedRowRender: (record) => (
                    <MasterInlineDetail
                      spec={spec}
                      recordId={String(record.id)}
                    />
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
                  onClick: () =>
                    setSelectedRowKeys((previous) => {
                      const recordKey = String(record.id)
                      return previous.includes(recordKey)
                        ? previous.filter((key) => key !== recordKey)
                        : [...previous, recordKey]
                    }),
                  onDoubleClick: () => {
                    if (
                      resolveModuleRecordCapabilities(record, moduleKey).canEdit
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
                pageSize={effectivePageSize}
                currentItemCount={records.length}
                overviewItems={overviewItems}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>

        <WorkspaceOverlay
          open={editorOpen}
          title={t('modules.editor.title', {
            mode: editorBaseRecord
              ? t('modules.editor.edit')
              : t('modules.editor.create'),
            title: spec.title,
          })}
          onClose={closeEditor}
        >
          <Form
            form={form}
            layout="vertical"
            disabled={saving}
            onValuesChange={(_, allValues) => setFormValues(allValues)}
          >
            <Row gutter={[12, 12]}>
              {spec.formFields
                .filter(
                  (field: MasterFormFieldSpec) =>
                    !field.visibleWhen || field.visibleWhen(formValues),
                )
                .map((field) => (
                  <Col key={field.key} span={field.fullRow ? 24 : 6}>
                    <Form.Item
                      name={field.key}
                      label={field.label}
                      initialValue={field.defaultValue}
                      rules={
                        field.required
                          ? [
                              {
                                required: true,
                                message: t('modules.formField.inputRequired', {
                                  label: field.label,
                                }),
                              },
                            ]
                          : undefined
                      }
                    >
                      {field.type === 'select' ? (
                        <Select
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          placeholder={field.placeholder}
                          options={field.options}
                        />
                      ) : field.type === 'number' ? (
                        <InputNumber
                          style={{ width: '100%' }}
                          min={field.min}
                          precision={field.precision}
                        />
                      ) : field.type === 'textarea' ? (
                        <Input.TextArea rows={3} />
                      ) : (
                        <Input
                          disabled={field.disabled}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Form.Item>
                  </Col>
                ))}
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
          moduleKey={moduleKey}
          recordId={attachmentRecordId}
          onClose={() => setAttachmentRecordId('')}
        />
      </div>
    </AppProPage>
  )
}
