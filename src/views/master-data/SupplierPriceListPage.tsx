import { PlusOutlined, ReloadOutlined, TableOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  DatePicker,
  Dropdown,
  Input,
  Select,
  Space,
  Table,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import {
  deleteSupplierPriceList,
  fetchSupplierPriceLists,
  type SupplierPriceListStatus,
  type SupplierPriceListSummary,
} from '@/api/master/supplier-price-lists'
import { AppProPage } from '@/components/AppProPage'
import { ColumnHeaderMenu } from '@/components/ColumnHeaderMenu'
import { ColumnSettingsRequestContext } from '@/components/column-settings-request-context'
import { RowContextMenuRow } from '@/components/RowContextMenuRow'
import {
  buildRowContextMenus,
  RowContextMenuContext,
  type RowContextMenuMap,
} from '@/components/row-context-menu'
import { StatusTag } from '@/components/StatusTag'
import { TableActions } from '@/components/TableActions'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import type { EntityId } from '@/types/entity-id'
import type { ModuleStatusMeta } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { ModuleTablePagination } from '@/views/modules/components/ModuleTablePagination'
import { useTableBodyScrollY } from '@/views/modules/components/use-table-body-scroll-y'
import { SupplierPriceListDetailOverlay } from './SupplierPriceListDetailOverlay'
import {
  SupplierPriceListEditor,
  type SupplierPriceListEditorMode,
} from './SupplierPriceListEditor'
import { SupplierPriceListMatrixOverlay } from './SupplierPriceListMatrixOverlay'
import './supplier-price-list.css'

const EMPTY_SUPPLIERS: never[] = []
const DEFAULT_PAGE_SIZE = 30
const STATUS_FILTER_VALUES: SupplierPriceListStatus[] = ['ACTIVE', 'ARCHIVED']

interface AppliedFilters {
  supplierId?: EntityId
  brandName?: string
  status?: SupplierPriceListStatus
  releasedFrom?: string
  releasedTo?: string
}

interface EditorState {
  open: boolean
  mode: SupplierPriceListEditorMode
  listId: EntityId | null
}

const CLOSED_EDITOR: EditorState = {
  open: false,
  mode: 'create',
  listId: null,
}

/**
 * 供应商品牌价格表维护页（列表 + 版本）。
 *
 * <p>列表列：供应商 / 品牌(产地) / 发布时刻 / 生效区间 / 状态 / 条目数 / 仓库 / 备注；
 * 操作：查看、编辑、另存为新版本、删除。固定标识见设计契约 4.1：
 * 权限资源与菜单 code = `supplier-price-lists`，路由 `/master-data/supplier-price-lists`。</p>
 */
export function SupplierPriceListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { shellRef, scrollY, shellStyle } = useTableBodyScrollY()

  const supplierOptionsQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: fetchSupplierOptions,
    staleTime: STALE_MASTER_OPTIONS,
  })
  const supplierOptions = supplierOptionsQuery.data ?? EMPTY_SUPPLIERS
  const materialBrands = useMaterialBrands()

  // 筛选草稿（点「查询」才提交）
  const [draftSupplierId, setDraftSupplierId] = useState<EntityId | undefined>()
  const [draftBrandName, setDraftBrandName] = useState<string | undefined>()
  const [draftStatus, setDraftStatus] = useState<
    SupplierPriceListStatus | undefined
  >()
  const [draftReleasedRange, setDraftReleasedRange] = useState<
    [Dayjs, Dayjs] | null
  >(null)

  const [applied, setApplied] = useState<AppliedFilters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<string[]>([])
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState>(CLOSED_EDITOR)
  const [detailListId, setDetailListId] = useState<EntityId | null>(null)
  const [matrixOpen, setMatrixOpen] = useState(false)

  const listQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceLists({
      ...applied,
      page,
      size: pageSize,
    }),
    queryFn: ({ signal }) =>
      fetchSupplierPriceLists(
        {
          ...applied,
          page,
          size: pageSize,
        },
        signal,
      ),
    staleTime: STALE_REALTIME,
  })

  const records = listQuery.data?.content ?? []
  const total = listQuery.data?.totalElements ?? 0
  const hiddenKeySet = useMemo(
    () => new Set(hiddenColumnKeys),
    [hiddenColumnKeys],
  )

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ['supplier-price-lists'],
    })
  }, [queryClient])

  const brandOptions = useMemo(() => {
    const fromSupplier = draftSupplierId
      ? (supplierOptions.find((option) => option.id === draftSupplierId)
          ?.brands ?? [])
      : []
    const source = fromSupplier.length ? fromSupplier : materialBrands
    const current = draftBrandName?.trim()
    const merged =
      current && !source.includes(current) ? [current, ...source] : source
    return merged.map((value) => ({ value, label: value }))
  }, [supplierOptions, draftSupplierId, materialBrands, draftBrandName])

  const handleSearch = () => {
    setPage(1)
    setApplied({
      ...(draftSupplierId ? { supplierId: draftSupplierId } : {}),
      ...(draftBrandName?.trim() ? { brandName: draftBrandName.trim() } : {}),
      ...(draftStatus ? { status: draftStatus } : {}),
      ...(draftReleasedRange
        ? {
            releasedFrom: draftReleasedRange[0].format('YYYY-MM-DDTHH:mm:ss'),
            releasedTo: draftReleasedRange[1].format('YYYY-MM-DDTHH:mm:ss'),
          }
        : {}),
    })
  }

  const handleReset = () => {
    setDraftSupplierId(undefined)
    setDraftBrandName(undefined)
    setDraftStatus(undefined)
    setDraftReleasedRange(null)
    setApplied({})
    setPage(1)
  }

  const openEditor = useCallback(
    (mode: SupplierPriceListEditorMode, record?: SupplierPriceListSummary) => {
      setEditor({
        open: true,
        mode,
        listId: record ? record.id : null,
      })
    },
    [],
  )

  const handleDelete = useCallback(
    async (record: SupplierPriceListSummary) => {
      try {
        await deleteSupplierPriceList(record.id)
        message.success(t('common.deleteSuccess'))
        refresh()
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : t('api.saveFailed'),
        )
      }
    },
    [refresh, t],
  )

  const buildActions = useCallback(
    (record: SupplierPriceListSummary) => [
      {
        key: 'view',
        label: t('supplierPriceList.actions.view'),
        onClick: () => setDetailListId(record.id),
      },
      {
        key: 'edit',
        label: t('supplierPriceList.actions.edit'),
        disabled: record.status === 'ARCHIVED',
        onClick: () => openEditor('edit', record),
      },
      {
        key: 'copy',
        label: t('supplierPriceList.actions.copyAsNew'),
        onClick: () => openEditor('copy', record),
      },
      {
        key: 'delete',
        label: t('common.delete'),
        danger: true,
        confirm: t('supplierPriceList.deleteConfirm', {
          supplier: record.supplierName,
          brand: record.brandName,
        }),
        onClick: () => void handleDelete(record),
      },
    ],
    [t, openEditor, handleDelete],
  )

  const rowContextMenus: RowContextMenuMap = useMemo(
    () =>
      buildRowContextMenus<SupplierPriceListSummary>({
        records,
        buildActions,
        labelOf: (record) => `${record.supplierName} ${record.brandName}`,
        ariaLabelOf: (label) => t('supplierPriceList.rowMenuLabel', { label }),
        okText: t('common.ok'),
        cancelText: t('common.cancel'),
        requestConfirm: ({ title, okText, cancelText, danger, onOk }) => {
          modal.confirm({
            title,
            okText,
            cancelText,
            okButtonProps: { danger },
            onOk,
          })
        },
      }),
    [records, buildActions, t],
  )

  const statusMap: Record<string, ModuleStatusMeta> = useMemo(
    () => ({
      ACTIVE: {
        text: t('supplierPriceList.status.active'),
        color: 'success',
      },
      ARCHIVED: {
        text: t('supplierPriceList.status.archived'),
        color: 'default',
      },
    }),
    [t],
  )

  const dataColumns: ColumnsType<SupplierPriceListSummary> = useMemo(() => {
    const base: ColumnsType<SupplierPriceListSummary> = [
      {
        key: 'supplierName',
        title: t('supplierPriceList.columns.supplier'),
        width: 180,
        ellipsis: true,
      },
      {
        key: 'brandName',
        title: t('supplierPriceList.columns.brand'),
        width: 140,
        ellipsis: true,
      },
      {
        key: 'releasedAt',
        title: t('supplierPriceList.columns.releasedAt'),
        width: 170,
        render: (_: unknown, record: SupplierPriceListSummary) =>
          record.releasedAt.replace('T', ' '),
      },
      {
        key: 'effectiveRange',
        title: t('supplierPriceList.columns.effectiveRange'),
        width: 200,
        render: (_: unknown, record: SupplierPriceListSummary) =>
          `${record.effectiveFrom} ~ ${
            record.effectiveTo ??
            t('supplierPriceList.columns.effectiveToForever')
          }`,
      },
      {
        key: 'status',
        title: t('common.status'),
        width: 100,
        align: 'center',
        render: (_: unknown, record: SupplierPriceListSummary) => (
          <StatusTag status={record.status} statusMap={statusMap} />
        ),
      },
      {
        key: 'itemCount',
        title: t('supplierPriceList.columns.itemCount'),
        width: 100,
        align: 'right',
      },
      {
        key: 'warehouse',
        title: t('supplierPriceList.header.warehouse'),
        width: 140,
        ellipsis: true,
        render: (_: unknown, record: SupplierPriceListSummary) =>
          record.warehouse || '-',
      },
      {
        key: 'remark',
        title: t('supplierPriceList.header.remark'),
        width: 200,
        ellipsis: true,
        render: (_: unknown, record: SupplierPriceListSummary) =>
          record.remark || '-',
      },
    ]
    return base.map((column) => {
      const columnTitle =
        typeof column.title === 'string' ? column.title : String(column.key)
      return {
        ...column,
        title: (
          <ColumnHeaderMenu
            key={String(column.key)}
            columnTitle={columnTitle}
            onHide={() =>
              setHiddenColumnKeys((previous) =>
                previous.includes(String(column.key))
                  ? previous.filter((key) => key !== String(column.key))
                  : [...previous, String(column.key)],
              )
            }
          >
            <span className="master-data-column-title">{columnTitle}</span>
          </ColumnHeaderMenu>
        ),
      }
    })
  }, [t, statusMap])

  const visibleColumns = useMemo(
    () =>
      [
        ...dataColumns.filter(
          (column) => !hiddenKeySet.has(String(column.key)),
        ),
        {
          key: 'actions',
          title: t('common.operation'),
          width: 240,
          fixed: 'right' as const,
          render: (_: unknown, record: SupplierPriceListSummary) => (
            <TableActions items={buildActions(record)} />
          ),
        },
      ] satisfies ColumnsType<SupplierPriceListSummary>,
    [dataColumns, hiddenKeySet, t, buildActions],
  )

  const overviewItems = useMemo(
    () => [
      {
        label: t('supplierPriceList.summary.totalRows'),
        value: String(total),
      },
    ],
    [t, total],
  )

  return (
    <AppProPage
      className="business-grid-pro-page"
      title={t('pages.supplier-price-lists')}
      description={t('supplierPriceList.pageDescription')}
    >
      <div className="page-stack module-page-stack">
        <ColumnSettingsRequestContext.Provider
          value={() => setColumnSettingsOpen(true)}
        >
          <section className="module-grid-workspace">
            <div className="module-grid-filter-region">
              <Space wrap>
                <Select
                  allowClear
                  showSearch={{ optionFilterProp: 'label' }}
                  style={{ width: 200 }}
                  aria-label={t('supplierPriceList.columns.supplier')}
                  placeholder={t('supplierPriceList.columns.supplier')}
                  value={draftSupplierId}
                  onChange={(value) => {
                    setDraftSupplierId(value)
                    setDraftBrandName(undefined)
                  }}
                  options={supplierOptions.map((option) => ({
                    value: option.id,
                    label: option.label,
                  }))}
                />
                {brandOptions.length ? (
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: 'label' }}
                    style={{ width: 180 }}
                    aria-label={t('supplierPriceList.columns.brand')}
                    placeholder={t('supplierPriceList.columns.brand')}
                    value={draftBrandName}
                    onChange={setDraftBrandName}
                    options={brandOptions}
                  />
                ) : (
                  <Input
                    allowClear
                    style={{ width: 180 }}
                    aria-label={t('supplierPriceList.columns.brand')}
                    placeholder={t('supplierPriceList.columns.brand')}
                    value={draftBrandName ?? ''}
                    onChange={(event) =>
                      setDraftBrandName(event.target.value || undefined)
                    }
                  />
                )}
                <Select
                  allowClear
                  style={{ width: 140 }}
                  aria-label={t('supplierPriceList.filter.status')}
                  placeholder={t('supplierPriceList.filter.status')}
                  value={draftStatus}
                  onChange={setDraftStatus}
                  options={STATUS_FILTER_VALUES.map((value) => ({
                    value,
                    label: t(`supplierPriceList.status.${value.toLowerCase()}`),
                  }))}
                />
                <DatePicker.RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  aria-label={t('supplierPriceList.filter.releasedRange')}
                  value={draftReleasedRange}
                  onChange={(value) =>
                    setDraftReleasedRange(
                      value && value[0] && value[1]
                        ? [value[0], value[1]]
                        : null,
                    )
                  }
                />
                <Button type="primary" onClick={handleSearch}>
                  {t('common.search')}
                </Button>
                <Button onClick={handleReset}>{t('common.reset')}</Button>
              </Space>
            </div>

            <div className="module-grid-command-region">
              <div className="module-table-toolbar">
                <Space wrap className="module-table-actions">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => openEditor('create')}
                  >
                    {t('supplierPriceList.actions.create')}
                  </Button>
                  <Button
                    icon={<TableOutlined />}
                    onClick={() => setMatrixOpen(true)}
                  >
                    {t('supplierPriceList.actions.matrix')}
                  </Button>
                  <Dropdown
                    trigger={['click']}
                    open={columnSettingsOpen}
                    onOpenChange={setColumnSettingsOpen}
                    menu={{
                      multiple: true,
                      selectedKeys: dataColumns.flatMap((column) =>
                        hiddenKeySet.has(String(column.key))
                          ? []
                          : [String(column.key)],
                      ),
                      onClick: ({ key }) =>
                        setHiddenColumnKeys((previous) =>
                          previous.includes(key)
                            ? previous.filter((item) => item !== key)
                            : [...previous, key],
                        ),
                      items: dataColumns.map((column) => ({
                        key: String(column.key),
                        label: String(column.title),
                      })),
                    }}
                  >
                    <Button>{t('common.columnSettings')}</Button>
                  </Dropdown>
                </Space>
                <div className="module-table-utilities">
                  <Tooltip title={t('common.refresh')}>
                    <Button
                      type="text"
                      className="module-table-refresh-button"
                      aria-label={t('common.refresh')}
                      icon={<ReloadOutlined />}
                      loading={listQuery.isFetching}
                      onClick={refresh}
                    />
                  </Tooltip>
                </div>
              </div>
            </div>

            {listQuery.error ? (
              <Alert
                type="error"
                showIcon
                className="module-grid-warning"
                title={
                  listQuery.error instanceof Error
                    ? listQuery.error.message
                    : t('api.loadFailed')
                }
                action={
                  <Button
                    size="small"
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={refresh}
                  >
                    {t('errorBoundary.retry')}
                  </Button>
                }
              />
            ) : null}

            <div
              ref={shellRef}
              className="module-table-shell"
              style={shellStyle}
            >
              <RowContextMenuContext.Provider value={rowContextMenus}>
                <Table<SupplierPriceListSummary>
                  rowKey={(record) => record.id}
                  size="small"
                  columns={visibleColumns}
                  dataSource={records}
                  loading={listQuery.isLoading || listQuery.isFetching}
                  pagination={false}
                  components={{ body: { row: RowContextMenuRow } }}
                  scroll={{ x: 'max-content', y: scrollY }}
                />
              </RowContextMenuContext.Provider>
            </div>

            <ModuleTablePagination
              total={total}
              currentPage={page}
              pageSize={pageSize}
              currentItemCount={records.length}
              overviewItems={overviewItems}
              onPageChange={(nextPage, nextPageSize) => {
                setPageSize(nextPageSize)
                setPage(nextPage)
              }}
            />
          </section>
        </ColumnSettingsRequestContext.Provider>
      </div>

      <SupplierPriceListEditor
        open={editor.open}
        mode={editor.mode}
        listId={editor.listId}
        supplierOptions={supplierOptions}
        onClose={() => setEditor(CLOSED_EDITOR)}
        onSaved={() => {
          setEditor(CLOSED_EDITOR)
          refresh()
        }}
      />
      <SupplierPriceListDetailOverlay
        open={Boolean(detailListId)}
        listId={detailListId}
        onClose={() => setDetailListId(null)}
      />
      <SupplierPriceListMatrixOverlay
        open={matrixOpen}
        supplierOptions={supplierOptions}
        onClose={() => setMatrixOpen(false)}
      />
    </AppProPage>
  )
}
