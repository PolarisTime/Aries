import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Pagination,
  Row,
  Select,
  Space,
  Spin,
  Table,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import type { SupplierOption } from '@/api/master/supplier-options'
import {
  createSupplierPriceAdjustment,
  createSupplierPriceList,
  fetchSupplierPriceList,
  fetchSupplierPriceSpecCatalog,
  type PriceAdjustmentMode,
  type SupplierPriceItemStatus,
  type SupplierPriceListDetail,
  updateSupplierPriceList,
} from '@/api/master/supplier-price-lists'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import type { EntityId } from '@/types/entity-id'
import { message, modal } from '@/utils/antd-app'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import { SupplierPriceListAdjustModal } from './SupplierPriceListAdjustModal'
import { SupplierPriceListPasteModal } from './SupplierPriceListPasteModal'
import {
  buildCatalogRows,
  buildPriceListPayload,
  computeDraftStats,
  describePriceRow,
  filterPriceRows,
  PRICE_ITEM_STATUS_I18N_KEYS,
  PRICE_ITEM_STATUS_ORDER,
  type PriceDraftRow,
  type PriceListHeaderDraft,
  type PriceRowFillFilter,
  validatePriceRows,
} from './supplier-price-list-editor-model'

export type SupplierPriceListEditorMode = 'create' | 'edit' | 'copy'

interface HeaderFormValues {
  supplierId?: EntityId
  brandName?: string
  releasedAt?: Dayjs
  effectiveFrom?: Dayjs
  effectiveTo?: Dayjs | null
  warehouse?: string
  remark?: string
}

interface Props {
  open: boolean
  mode: SupplierPriceListEditorMode
  /** `edit` / `copy` 的源版本 ID；`create` 为 null */
  listId: EntityId | null
  supplierOptions: SupplierOption[]
  onClose: () => void
  onSaved: (detail?: SupplierPriceListDetail) => void
}

const PAGE_SIZE_OPTIONS = [50, 100, 200]
const DEFAULT_PAGE_SIZE = 100

function toHeaderDraft(values: HeaderFormValues): PriceListHeaderDraft {
  return {
    supplierId: values.supplierId ?? '',
    brandName: values.brandName ?? '',
    releasedAt: values.releasedAt
      ? values.releasedAt.format('YYYY-MM-DDTHH:mm:00')
      : '',
    effectiveFrom: values.effectiveFrom
      ? values.effectiveFrom.format('YYYY-MM-DD')
      : '',
    effectiveTo: values.effectiveTo
      ? values.effectiveTo.format('YYYY-MM-DD')
      : null,
    warehouse: values.warehouse ?? null,
    remark: values.remark ?? null,
  }
}

/**
 * 供应商品牌价格表编辑器。
 *
 * <p>R1 口径：**不自由增行**。行由 `GET /supplier-price-lists/spec-catalog` 的规格全集固定生成，
 * 用户只填「单价 / 状态 / 备注」；单价留空 = 不报价（与 0 元严格区分）。规格全集可能有数百行，
 * 因此提供筛选 + 「只看未填/已填」+ 分页，并在「单价」列内用 Tab 纵向连续录入。</p>
 */
export function SupplierPriceListEditor({
  open,
  mode,
  listId,
  supplierOptions,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<HeaderFormValues>()
  const [headerValues, setHeaderValues] = useState<HeaderFormValues>({})
  const [rows, setRows] = useState<PriceDraftRow[]>([])
  const [unmatchedPrior, setUnmatchedPrior] = useState<
    SupplierPriceListDetail['items']
  >([])
  const [baselineSignature, setBaselineSignature] = useState('')
  const [keyword, setKeyword] = useState('')
  const [fillFilter, setFillFilter] = useState<PriceRowFillFilter>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [materialFilter, setMaterialFilter] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [saving, setSaving] = useState(false)
  const [adjusting, setAdjusting] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteSeed, setPasteSeed] = useState('')
  const initializedRef = useRef('')
  const tableShellRef = useRef<HTMLDivElement | null>(null)

  const needsDetail = mode !== 'create' && Boolean(listId)

  const detailQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceList(listId ?? ''),
    queryFn: ({ signal }) => fetchSupplierPriceList(listId as EntityId, signal),
    enabled: open && needsDetail,
    staleTime: STALE_REALTIME,
  })

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceListSpecCatalog('', ''),
    queryFn: ({ signal }) => fetchSupplierPriceSpecCatalog({}, signal),
    enabled: open,
    staleTime: STALE_MASTER_OPTIONS,
  })

  const detail = detailQuery.data

  // 打开/切换目标版本时用规格全集重建固定行（只做一次，避免覆盖用户编辑）
  useEffect(() => {
    if (!open) {
      initializedRef.current = ''
      return
    }
    if (!catalogQuery.data) {
      return
    }
    if (needsDetail && !detail) {
      return
    }
    const token = `${mode}:${listId ?? ''}`
    if (initializedRef.current === token) {
      return
    }
    const built = buildCatalogRows(catalogQuery.data, detail?.items ?? [])
    /*
     * 另存为新版本时只继承「供应商 / 品牌 / 仓库 / 备注」与条目价格：
     * 发布时间必须用「现在」，沿用旧版本的同一时刻会被后端判为 409（同供应商+品牌同一时刻仅一版）。
     */
    const nextHeader: HeaderFormValues = detail
      ? {
          supplierId: detail.supplierId,
          brandName: detail.brandName,
          releasedAt: mode === 'copy' ? dayjs() : dayjs(detail.releasedAt),
          effectiveFrom:
            mode === 'copy'
              ? dayjs()
              : detail.effectiveFrom
                ? dayjs(detail.effectiveFrom)
                : dayjs(),
          effectiveTo:
            mode === 'copy'
              ? null
              : detail.effectiveTo
                ? dayjs(detail.effectiveTo)
                : null,
          warehouse: detail.warehouse ?? '',
          remark: detail.remark ?? '',
        }
      : {
          releasedAt: dayjs(),
          effectiveFrom: dayjs(),
          effectiveTo: null,
          brandName: '',
          warehouse: '',
          remark: '',
        }
    setRows(built.rows)
    setUnmatchedPrior(built.unmatchedPriorItems)
    setHeaderValues(nextHeader)
    form.setFieldsValue(nextHeader)
    setBaselineSignature(
      JSON.stringify(
        buildPriceListPayload(toHeaderDraft(nextHeader), built.rows),
      ),
    )
    setKeyword('')
    setFillFilter('ALL')
    setCategoryFilter(undefined)
    setMaterialFilter(undefined)
    setPage(1)
    initializedRef.current = token
  }, [open, mode, listId, catalogQuery.data, detail, needsDetail, form])

  const currentSignature = useMemo(
    () =>
      JSON.stringify(buildPriceListPayload(toHeaderDraft(headerValues), rows)),
    [headerValues, rows],
  )
  const dirty =
    Boolean(baselineSignature) && currentSignature !== baselineSignature

  const rowErrorMap = useMemo(() => validatePriceRows(rows), [rows])
  const stats = useMemo(() => computeDraftStats(rows), [rows])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of rows) {
      if (row.category) {
        set.add(row.category)
      }
    }
    return [...set].map((value) => ({ value, label: value }))
  }, [rows])

  const materialOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of rows) {
      if (
        row.material &&
        (!categoryFilter || row.category === categoryFilter)
      ) {
        set.add(row.material)
      }
    }
    return [...set].map((value) => ({ value, label: value }))
  }, [rows, categoryFilter])

  const filteredRows = useMemo(
    () =>
      filterPriceRows(rows, {
        keyword,
        fill: fillFilter,
        category: categoryFilter,
        material: materialFilter,
      }),
    [rows, keyword, fillFilter, categoryFilter, materialFilter],
  )

  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  )

  // 每页重置到第 1 页，避免筛选后停留在越界页
  const handleFilterChange = useCallback(() => setPage(1), [])

  const pageIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const [index, row] of pageRows.entries()) {
      map.set(row.uid, index)
    }
    return map
  }, [pageRows])

  /** 单价列内 Tab / Shift+Tab 纵向移动（表格内连续录入的主路径）。 */
  const handlePriceKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>, row: PriceDraftRow) => {
      if (event.key !== 'Tab') {
        return
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        // 组合键交给浏览器/读屏，不做拦截
        return
      }
      const index = pageIndexByKey.get(row.uid)
      if (index === undefined) {
        return
      }
      const nextIndex = event.shiftKey ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= pageRows.length) {
        return
      }
      const target = tableShellRef.current?.querySelector<HTMLInputElement>(
        `input[data-price-index="${nextIndex}"]`,
      )
      if (!target) {
        return
      }
      event.preventDefault()
      target.focus()
      target.select()
    },
    [pageIndexByKey, pageRows.length],
  )

  const supplierBrands = useMemo(() => {
    const option = supplierOptions.find(
      (item) => item.id === headerValues.supplierId,
    )
    return option?.brands ?? []
  }, [supplierOptions, headerValues.supplierId])

  const brandOptions = useMemo(() => {
    const current = headerValues.brandName?.trim()
    const list =
      current && !supplierBrands.includes(current)
        ? [current, ...supplierBrands]
        : supplierBrands
    return list.map((value) => ({ value, label: value }))
  }, [supplierBrands, headerValues.brandName])

  const updateRow = useCallback(
    (key: string, patch: Partial<PriceDraftRow>) => {
      setRows((previous) =>
        previous.map((row) => (row.uid === key ? { ...row, ...patch } : row)),
      )
    },
    [],
  )

  const runSubmit = useCallback(
    async (payload: ReturnType<typeof buildPriceListPayload>) => {
      setSaving(true)
      try {
        if (mode === 'edit' && listId) {
          await updateSupplierPriceList(listId, payload)
          message.success(t('common.saveSuccess'))
          onSaved()
        } else {
          const result = await createSupplierPriceList(payload)
          message.success(
            result.archivedListId
              ? t('supplierPriceList.savedWithArchived')
              : t('common.saveSuccess'),
          )
          onSaved(result.list)
        }
      } catch (error) {
        message.error(
          error instanceof Error ? error.message : t('api.saveFailed'),
        )
      } finally {
        setSaving(false)
      }
    },
    [mode, listId, onSaved, t],
  )

  const handleSave = async () => {
    let values: HeaderFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (rowErrorMap.size) {
      message.error(t('supplierPriceList.rowErrorsBlockSave'))
      return
    }
    const payload = buildPriceListPayload(toHeaderDraft(values), rows)
    if (
      !payload.items.length ||
      payload.items.every((item) => item.price === null)
    ) {
      modal.confirm({
        title: t('supplierPriceList.allEmptyConfirmTitle'),
        content: t('supplierPriceList.allEmptyConfirmContent'),
        okText: t('common.ok'),
        cancelText: t('common.cancel'),
        onOk: () => runSubmit(payload),
      })
      return
    }
    await runSubmit(payload)
  }

  const handleAdjustSubmit = async (
    adjustMode: PriceAdjustmentMode,
    amount: number,
  ) => {
    if (!listId) {
      return
    }
    setAdjusting(true)
    try {
      const itemIds = rows.flatMap((row) =>
        row.itemId && row.price !== null ? [row.itemId] : [],
      )
      const result = await createSupplierPriceAdjustment(listId, {
        mode: adjustMode,
        amount,
        itemIds,
      })
      message.success(
        t('supplierPriceList.adjust.success', { count: result.affectedCount }),
      )
      setAdjustOpen(false)
      // 用服务端结果重建基线，避免把服务端改动误判为未保存编辑
      initializedRef.current = ''
      await detailQuery.refetch()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    } finally {
      setAdjusting(false)
    }
  }

  const archived = mode === 'edit' && detail?.status === 'ARCHIVED'
  const loading =
    catalogQuery.isLoading || (needsDetail && detailQuery.isLoading)
  const loadError =
    catalogQuery.error ?? (needsDetail ? detailQuery.error : null)

  const columns: ColumnsType<PriceDraftRow> = useMemo(
    () => [
      {
        title: t('supplierPriceList.columns.category'),
        dataIndex: 'category',
        width: 110,
        ellipsis: true,
      },
      {
        title: t('supplierPriceList.columns.material'),
        dataIndex: 'material',
        width: 150,
        ellipsis: true,
        render: (_: unknown, row) => {
          const duplicate = rowErrorMap.get(row.uid)?.duplicate
          return (
            <div className="supplier-price-cell">
              <span>{row.material}</span>
              {duplicate ? (
                <span
                  className="supplier-price-row-duplicate"
                  role="alert"
                  id={`price-duplicate-${row.uid}`}
                >
                  {duplicate}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        title: t('supplierPriceList.columns.spec'),
        dataIndex: 'spec',
        width: 110,
        align: 'right',
        render: (_: unknown, row) => {
          const specError = rowErrorMap.get(row.uid)?.spec
          return (
            <div className="supplier-price-cell">
              <span>Φ{row.spec}</span>
              {specError ? (
                <span className="supplier-price-row-error" role="alert">
                  {specError}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        title: t('supplierPriceList.columns.length'),
        dataIndex: 'length',
        width: 100,
      },
      {
        title: t('supplierPriceList.columns.price'),
        key: 'price',
        width: 170,
        render: (_: unknown, row) => {
          const error = rowErrorMap.get(row.uid)?.price
          const index = pageIndexByKey.get(row.uid)
          const rowLabel = describePriceRow(row)
          return (
            <div className="supplier-price-cell">
              <InputNumber
                size="small"
                min={0}
                precision={2}
                controls={false}
                status={error ? 'error' : undefined}
                placeholder={t('supplierPriceList.priceEmptyHint')}
                aria-label={t('supplierPriceList.columns.priceNamed', {
                  row: rowLabel,
                })}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `price-error-${row.uid}` : undefined}
                data-price-index={index}
                value={row.price}
                onChange={(value) => updateRow(row.uid, { price: value })}
                onKeyDown={(event) => handlePriceKeyDown(event, row)}
                onPaste={(event) => {
                  const text = event.clipboardData.getData('text')
                  if (!/[\t\r\n]/.test(text)) {
                    return
                  }
                  event.preventDefault()
                  setPasteSeed(text)
                  setPasteOpen(true)
                }}
              />
              {error ? (
                <span
                  className="supplier-price-row-error"
                  role="alert"
                  id={`price-error-${row.uid}`}
                >
                  {error}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        title: t('supplierPriceList.columns.priceStatus'),
        key: 'priceStatus',
        width: 140,
        render: (_: unknown, row) => (
          <Select<SupplierPriceItemStatus>
            size="small"
            aria-label={t('supplierPriceList.columns.statusNamed', {
              row: describePriceRow(row),
            })}
            value={row.priceStatus}
            onChange={(value) => updateRow(row.uid, { priceStatus: value })}
            options={PRICE_ITEM_STATUS_ORDER.map((status) => ({
              value: status,
              label: t(PRICE_ITEM_STATUS_I18N_KEYS[status]),
            }))}
          />
        ),
      },
      {
        title: t('supplierPriceList.columns.remark'),
        key: 'remark',
        width: 200,
        render: (_: unknown, row) => (
          <Input
            size="small"
            maxLength={255}
            aria-label={t('supplierPriceList.columns.remarkNamed', {
              row: describePriceRow(row),
            })}
            value={row.remark ?? ''}
            onChange={(event) =>
              updateRow(row.uid, { remark: event.target.value })
            }
          />
        ),
      },
    ],
    [t, rowErrorMap, pageIndexByKey, updateRow, handlePriceKeyDown],
  )

  return (
    <WorkspaceOverlay
      open={open}
      title={t(`supplierPriceList.editor.title.${mode}`)}
      width={1280}
      onClose={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            disabled={archived || loading}
            onClick={() => void handleSave()}
          >
            {t('common.save')}
          </Button>
        </Space>
      }
    >
      <div className="supplier-price-list-editor">
        {archived ? (
          <Alert
            type="warning"
            showIcon
            title={t('supplierPriceList.archivedReadonly')}
          />
        ) : null}
        {unmatchedPrior.length ? (
          <Alert
            type="warning"
            showIcon
            title={t('supplierPriceList.unmatchedPrior', {
              count: unmatchedPrior.length,
            })}
          />
        ) : null}
        {loadError ? (
          <Alert
            type="error"
            showIcon
            title={
              loadError instanceof Error
                ? loadError.message
                : t('api.loadFailed')
            }
            action={
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  void catalogQuery.refetch()
                  if (needsDetail) {
                    void detailQuery.refetch()
                  }
                }}
              >
                {t('errorBoundary.retry')}
              </Button>
            }
          />
        ) : null}

        <div className="supplier-price-list-editor-header">
          <Form
            form={form}
            layout="vertical"
            disabled={saving || archived}
            onValuesChange={(_, allValues: HeaderFormValues) => {
              setHeaderValues(allValues)
            }}
          >
            <Row gutter={[12, 8]}>
              <Col span={6}>
                <Form.Item
                  name="supplierId"
                  label={t('supplierPriceList.header.supplier')}
                  rules={[
                    {
                      required: true,
                      message: t('supplierPriceList.header.supplierRequired'),
                    },
                  ]}
                >
                  <Select
                    allowClear
                    showSearch={{ optionFilterProp: 'label' }}
                    placeholder={t('common.pleaseSelect')}
                    options={supplierOptions.map((option) => ({
                      value: option.id,
                      label: option.label,
                    }))}
                    onChange={() => {
                      // 切换供应商后经营品牌变化，清掉不再有效的品牌值
                      const next = form.getFieldValue('brandName') as
                        | string
                        | undefined
                      const supplierId = form.getFieldValue('supplierId') as
                        | string
                        | undefined
                      const brands =
                        supplierOptions.find((item) => item.id === supplierId)
                          ?.brands ?? []
                      if (next && !brands.includes(next)) {
                        form.setFieldsValue({ brandName: undefined })
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="brandName"
                  label={t('supplierPriceList.header.brand')}
                  rules={[
                    {
                      required: true,
                      message: t('supplierPriceList.header.brandRequired'),
                    },
                  ]}
                >
                  {brandOptions.length ? (
                    <Select
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      placeholder={t('common.pleaseSelect')}
                      options={brandOptions}
                    />
                  ) : (
                    <Input
                      maxLength={64}
                      placeholder={t('supplierPriceList.header.brandManual')}
                    />
                  )}
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="releasedAt"
                  label={t('supplierPriceList.header.releasedAt')}
                  rules={[
                    {
                      required: true,
                      message: t('supplierPriceList.header.releasedAtRequired'),
                    },
                  ]}
                >
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="warehouse"
                  label={t('supplierPriceList.header.warehouse')}
                >
                  <Input
                    maxLength={64}
                    placeholder={t('supplierPriceList.header.warehouseHint')}
                  />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="effectiveFrom"
                  label={t('supplierPriceList.header.effectiveFrom')}
                  rules={[
                    {
                      required: true,
                      message: t(
                        'supplierPriceList.header.effectiveFromRequired',
                      ),
                    },
                  ]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="effectiveTo"
                  label={t('supplierPriceList.header.effectiveTo')}
                  rules={[
                    {
                      validator: (_rule, value: Dayjs | null | undefined) => {
                        const from = form.getFieldValue('effectiveFrom') as
                          | Dayjs
                          | undefined
                        if (value && from && value.isBefore(from, 'day')) {
                          return Promise.reject(
                            new Error(
                              t('supplierPriceList.header.effectiveToInvalid'),
                            ),
                          )
                        }
                        return Promise.resolve()
                      },
                    },
                  ]}
                >
                  <DatePicker
                    allowClear
                    style={{ width: '100%' }}
                    placeholder={t('supplierPriceList.header.effectiveToHint')}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="remark"
                  label={t('supplierPriceList.header.remark')}
                >
                  <Input maxLength={255} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        <div className="supplier-price-list-editor-actions">
          <Input
            allowClear
            style={{ width: 240 }}
            aria-label={t('supplierPriceList.filter.keyword')}
            placeholder={t('supplierPriceList.filter.keyword')}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              handleFilterChange()
            }}
          />
          <Select
            allowClear
            style={{ width: 140 }}
            aria-label={t('supplierPriceList.filter.category')}
            placeholder={t('supplierPriceList.filter.category')}
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value)
              setMaterialFilter(undefined)
              handleFilterChange()
            }}
            options={categoryOptions}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            aria-label={t('supplierPriceList.filter.material')}
            placeholder={t('supplierPriceList.filter.material')}
            value={materialFilter}
            onChange={(value) => {
              setMaterialFilter(value)
              handleFilterChange()
            }}
            options={materialOptions}
          />
          <Select<PriceRowFillFilter>
            style={{ width: 140 }}
            aria-label={t('supplierPriceList.filter.fill')}
            value={fillFilter}
            onChange={(value) => {
              setFillFilter(value)
              handleFilterChange()
            }}
            options={[
              { value: 'ALL', label: t('supplierPriceList.filter.fillAll') },
              {
                value: 'UNFILLED',
                label: t('supplierPriceList.filter.fillUnfilled'),
              },
              {
                value: 'FILLED',
                label: t('supplierPriceList.filter.fillFilled'),
              },
            ]}
          />
          <Button
            disabled={mode !== 'edit' || dirty || archived}
            onClick={() => setAdjustOpen(true)}
          >
            {t('supplierPriceList.actions.adjust')}
          </Button>
          {mode === 'edit' && (dirty || archived) ? (
            // 禁用按钮不参与 Tab 序, 提示必须作为可见文本给出, 否则键盘/读屏用户拿不到原因
            <span className="supplier-price-list-editor-hint">
              {t('supplierPriceList.adjust.requiresSavedHint')}
            </span>
          ) : null}
          <Button
            onClick={() => {
              setPasteSeed('')
              setPasteOpen(true)
            }}
          >
            {t('supplierPriceList.actions.paste')}
          </Button>
          <span
            className="supplier-price-list-editor-summary"
            aria-live="polite"
          >
            <span>
              {t('supplierPriceList.summary.total', { count: stats.total })}
            </span>
            <span>
              {t('supplierPriceList.summary.filled', { count: stats.filled })}
            </span>
            <span>
              {t('supplierPriceList.summary.empty', { count: stats.empty })}
            </span>
            <span>
              {t('supplierPriceList.summary.filtered', {
                count: filteredRows.length,
              })}
            </span>
            {dirty ? (
              <span>{t('supplierPriceList.summary.unsaved')}</span>
            ) : null}
          </span>
        </div>

        <div ref={tableShellRef} className="supplier-price-list-editor-table">
          <Spin spinning={loading}>
            <Table<PriceDraftRow>
              rowKey="uid"
              size="small"
              columns={columns}
              dataSource={pageRows}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </Spin>
        </div>

        <div className="supplier-price-list-editor-pagination">
          <Pagination
            size="small"
            current={page}
            pageSize={pageSize}
            total={filteredRows.length}
            showSizeChanger
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            showTotal={(total) =>
              t('supplierPriceList.paginationTotal', { count: total })
            }
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
            }}
          />
        </div>
      </div>

      <SupplierPriceListAdjustModal
        open={adjustOpen}
        rows={rows}
        saving={adjusting}
        onCancel={() => setAdjustOpen(false)}
        onSubmit={(adjustMode, amount) =>
          void handleAdjustSubmit(adjustMode, amount)
        }
      />
      <SupplierPriceListPasteModal
        open={pasteOpen}
        rows={rows}
        initialText={pasteSeed}
        onCancel={() => setPasteOpen(false)}
        onApply={(nextRows, result) => {
          setRows(nextRows)
          setPasteOpen(false)
          message.success(
            t('supplierPriceList.paste.appliedToast', {
              count: result.appliedCount,
            }),
          )
        }}
      />
    </WorkspaceOverlay>
  )
}
