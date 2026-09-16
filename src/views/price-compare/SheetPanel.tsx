import {
  DeleteOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  SettingOutlined,
  TrophyOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Flex,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from '@/utils/antd-app'
import {
  CATEGORIES,
  makeRow,
  moveItem,
  netPriceWithFallback,
  resolveRef,
  SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
  syncSpotInputs,
} from './core'
import { LockableField } from './LockableField'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetInput,
  SheetInputs,
  Variety,
} from './types'
import './price-compare.css'

const { Text } = Typography

function moveFocus(orderedRows: PriceRow[]) {
  return (brandName: string, rowId: string, delta: number) => {
    const index = orderedRows.findIndex((row) => row.id === rowId)
    const target = orderedRows[index + delta]
    if (!target) return
    const input = document.querySelector<HTMLInputElement>(
      `input[data-spot="${brandName}:${target.id}"]`,
    )
    input?.focus()
    input?.select()
  }
}

function moveFocusTon(orderedRows: PriceRow[]) {
  return (rowId: string, delta: number) => {
    const index = orderedRows.findIndex((row) => row.id === rowId)
    const target = orderedRows[index + delta]
    if (!target) return
    const input = document.querySelector<HTMLInputElement>(
      `input[data-ton="${target.id}"]`,
    )
    input?.focus()
    input?.select()
  }
}

/* ------------------------------------------------------------------ 列定义 */

type ColumnContext = {
  sheet: PriceSheet
  t: TFunction
  refDate: string
  refPeriod: string
  lengthPremium: number
  varietyByLabel: Map<string, Variety>
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  getSpot: (brandName: string, rowId: string) => number | undefined
  setSpot: (brandName: string, rowId: string, value: number | undefined) => void
  getInput: (brandName: string, rowId: string) => SheetInput | undefined
  setSupplier: (
    brandName: string,
    rowId: string,
    option: { value: string; label: string } | undefined,
  ) => void
  supplierOptions: { value: string; label: string }[]
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  moveFocus: (brandName: string, rowId: string, delta: number) => void
  moveFocusTon: (rowId: string, delta: number) => void
  onReorderBrands: (from: number, to: number) => void
  onRowDragStart: (rowId: string, event: React.DragEvent<HTMLElement>) => void
  onRowDragEnd: () => void
  selectedIds: string[]
  toggleSelect: (rowId: string, checked: boolean) => void
  toggleAll: (checked: boolean) => void
  attachSpotRef: boolean
  allowHrb400eFallback: boolean
  allowedProducts?: string[]
  bestOn: boolean
  spotResetNonce: number
  onInvalidSpot: () => void
  spotRef: React.RefObject<HTMLSpanElement | null>
}

const cellOf = (
  title: string,
  width: number,
  render: (value: unknown, row: GridRow) => React.ReactNode,
) => ({
  title,
  width,
  align: 'center' as const,
  render,
})

const varietyKeyOf = (item: Variety) =>
  `${item.category}|${item.material}|${item.spec}|${item.length}`

/** 精简展示: 类别单列展示, 选项只显示 材质/规格/长度。 */
const varietyDisplay = (item: Variety) =>
  [item.material, item.spec, item.length === '-' ? '' : item.length]
    .filter(Boolean)
    .join(' ')

function buildVarietyOptions(varieties: Variety[]) {
  return CATEGORIES.reduce<
    { label: string; options: { value: string; label: string }[] }[]
  >((groups, category) => {
    const options: { value: string; label: string }[] = []
    for (const item of varieties) {
      if (item.category === category)
        options.push({ value: varietyKeyOf(item), label: varietyDisplay(item) })
    }
    if (options.length) groups.push({ label: category, options })
    return groups
  }, [])
}

function buildSheetColumns(ctx: ColumnContext): ColumnsType<GridRow> {
  const {
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    brands,
    rows,
    getSpot,
    setSpot,
    patchRow,
    moveFocus,
    selectedIds,
    toggleSelect,
    toggleAll,
    onRowDragStart,
    onRowDragEnd,
    onReorderBrands,
    attachSpotRef,
    allowHrb400eFallback,
    allowedProducts,
    bestOn,
    t,
  } = ctx
  const enabledCategories = new Set<string>()
  if (!brands.length) {
    for (const category of CATEGORIES) enabledCategories.add(category)
  } else {
    for (const brand of brands) {
      const list = brand.categories?.length ? brand.categories : CATEGORIES
      for (const category of list) enabledCategories.add(category)
    }
  }
  const allowedProductSet = new Set(allowedProducts ?? [])
  const varietyOptions = buildVarietyOptions(
    ctx.varieties.filter(
      (item) =>
        enabledCategories.has(item.category) &&
        (allowedProductSet.size === 0 ||
          allowedProductSet.has(varietyKeyOf(item))),
    ),
  )
  const bestCache = new Map<string, string | undefined>()
  const bestOf = (row: GridRow): string | undefined => {
    if (!bestOn) return undefined
    if (bestCache.has(row.rowId)) return bestCache.get(row.rowId)
    let best: string | undefined
    let bestVal = Number.NEGATIVE_INFINITY
    for (const brand of brands) {
      const price = isCategoryEnabled(brand, row.row.category)
        ? netPriceWithFallback(
            data,
            refDate,
            refPeriod,
            brand.name,
            row.row,
            lengthPremium,
            allowHrb400eFallback,
          ).value
        : undefined
      const spot = getSpot(brand.name, row.row.id)
      if (price === undefined || spot === undefined) continue
      const diff = price - spot - brand.freight
      if (diff > bestVal) {
        bestVal = diff
        best = brand.name
      }
    }
    bestCache.set(row.rowId, best)
    return best
  }
  const isDimmed = (row: GridRow, brandName: string) => {
    const best = bestOf(row)
    return best !== undefined && best !== brandName
  }

  const isCategoryEnabled = (brand: Brand, category: string) =>
    !brand.categories ||
    brand.categories.length === 0 ||
    !category ||
    brand.categories.includes(category)
  const allChecked = rows.length > 0 && selectedIds.length === rows.length
  const someChecked = selectedIds.length > 0 && !allChecked

  return [
    {
      title: (
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          disabled={rows.length === 0}
          onChange={(event) => toggleAll(event.target.checked)}
        />
      ),
      width: 32,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <Checkbox
          checked={selectedIds.includes(row.rowId)}
          onChange={(event) => toggleSelect(row.rowId, event.target.checked)}
        />
      ),
    },
    {
      title: '',
      width: 24,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <span
          className="price-compare-row-drag"
          draggable
          title={t('priceCompare.sheet.dragRow')}
          onDragStart={(event) => onRowDragStart(row.rowId, event)}
          onDragEnd={onRowDragEnd}
        >
          <HolderOutlined />
        </span>
      ),
    },
    {
      title: t('priceCompare.sheet.columns.category'),
      dataIndex: 'category',
      width: SHEET_COLUMN_WIDTH.category,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <span className="price-compare-category">{row.row.category}</span>
      ),
    },
    {
      title: t('priceCompare.sheet.columns.variety'),
      dataIndex: 'base',
      width: SHEET_COLUMN_WIDTH.spec,
      fixed: 'left',
      render: (_, row) => {
        const current = row.row
        const value =
          current && current.material
            ? `${current.category}|${current.material}|${current.spec}|${current.length}`
            : undefined
        return (
          <Select
            size="small"
            variant="borderless"
            style={{ width: SHEET_COLUMN_WIDTH.spec - 12 }}
            placeholder={t('priceCompare.sheet.selectProduct')}
            showSearch={{ optionFilterProp: 'label' }}
            value={value}
            options={varietyOptions}
            onChange={(key) => {
              const target = varietyByLabel.get(key)
              if (!target) return
              patchRow(row.rowId, {
                category: target.category,
                material: target.material,
                spec: target.spec,
                length: target.length,
              })
            }}
          />
        )
      },
    },
    {
      title: t('priceCompare.sheet.columns.ton'),
      width: SHEET_COLUMN_WIDTH.ton,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <Input
          key={`ton:${row.rowId}:${row.row.ton ?? ''}`}
          className="price-compare-ton"
          size="small"
          variant="borderless"
          inputMode="decimal"
          data-ton={row.rowId}
          defaultValue={row.row.ton === undefined ? '' : String(row.row.ton)}
          onBlur={(event) => {
            const raw = event.target.value
            const value = Number(raw)
            if (raw !== '' && (Number.isNaN(value) || value <= 0)) {
              message.warning(t('priceCompare.sheet.tonPositive'))
              return
            }
            patchRow(row.rowId, { ton: raw === '' ? undefined : value })
          }}
          onPressEnter={(event) => {
            const raw = (event.target as HTMLInputElement).value
            const value = Number(raw)
            if (raw === '') patchRow(row.rowId, { ton: undefined })
            else if (!Number.isNaN(value) && value > 0)
              patchRow(row.rowId, { ton: value })
          }}
          onKeyDown={(event) => {
            if (event.key === 'Tab') {
              event.preventDefault()
              ctx.moveFocusTon(row.rowId, event.shiftKey ? -1 : 1)
            }
          }}
        />
      ),
    },
    ...brands.flatMap(
      (brand, brandIndex): ColumnsType<GridRow> => [
        {
          title: (
            <span
              className="price-compare-brand-name price-compare-drag"
              draggable
              title={t('priceCompare.sheet.dragBrand')}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(brandIndex))
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const from = Number(event.dataTransfer.getData('text/plain'))
                if (!Number.isNaN(from)) onReorderBrands(from, brandIndex)
              }}
            >
              {brand.name}
            </span>
          ),
          children: [
            cellOf(
              t('priceCompare.sheet.columns.net'),
              SHEET_COLUMN_WIDTH.net,
              (_, row) => {
                const resolved = isCategoryEnabled(brand, row.row.category)
                  ? netPriceWithFallback(
                      data,
                      refDate,
                      refPeriod,
                      brand.name,
                      row.row,
                      lengthPremium,
                      allowHrb400eFallback,
                    )
                  : { value: undefined, fallback: false }
                const price = resolved.value
                return price === undefined ? (
                  <div className="price-compare-num price-compare-sub">-</div>
                ) : (
                  <div
                    className={`price-compare-net price-compare-num${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}${resolved.fallback ? ' price-compare-fallback' : ''}`}
                  >
                    {resolved.fallback ? (
                      <Tooltip title={t('priceCompare.sheet.fallbackTooltip')}>
                        <span className="price-compare-fallback-value">
                          {price}
                          <span className="price-compare-fallback-badge">
                            E
                          </span>
                        </span>
                      </Tooltip>
                    ) : (
                      price
                    )}
                  </div>
                )
              },
            ),
            cellOf(
              t('priceCompare.sheet.columns.spot'),
              SHEET_COLUMN_WIDTH.spot,
              (_, row) => {
                const current = row.row
                const spot = getSpot(brand.name, current.id)
                const isFirst =
                  attachSpotRef &&
                  brandIndex === 0 &&
                  current.id === rows[0]?.id
                const input = (
                  <Flex vertical gap={0}>
                    <Input
                      key={`${brand.name}:${current.id}:${spot ?? ''}:${ctx.spotResetNonce}`}
                      className={`price-compare-spot${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                      size="small"
                      variant="borderless"
                      inputMode="decimal"
                      data-spot={`${brand.name}:${current.id}`}
                      defaultValue={spot === undefined ? '' : String(spot)}
                      onBlur={(event) => {
                        const raw = event.target.value
                        const value = Number(raw)
                        if (
                          raw !== '' &&
                          (Number.isNaN(value) ||
                            value <= 0 ||
                            value > SPOT_PRICE_MAX)
                        ) {
                          message.warning(
                            t('priceCompare.sheet.spotOutOfRange', {
                              max: SPOT_PRICE_MAX,
                            }),
                          )
                          // 非法输入：触发重挂载，恢复为已保存值
                          ctx.onInvalidSpot()
                          return
                        }
                        setSpot(
                          brand.name,
                          current.id,
                          raw === '' ? undefined : value,
                        )
                      }}
                      onPressEnter={(event) => {
                        const raw = (event.target as HTMLInputElement).value
                        const value = Number(raw)
                        if (
                          raw === '' ||
                          (!Number.isNaN(value) &&
                            value > 0 &&
                            value <= SPOT_PRICE_MAX)
                        ) {
                          setSpot(
                            brand.name,
                            current.id,
                            raw === '' ? undefined : value,
                          )
                        }
                        event.preventDefault()
                        moveFocus(brand.name, current.id, 1)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault()
                          moveFocus(brand.name, current.id, 1)
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault()
                          moveFocus(brand.name, current.id, -1)
                        } else if (event.key === 'Tab') {
                          event.preventDefault()
                          moveFocus(
                            brand.name,
                            current.id,
                            event.shiftKey ? -1 : 1,
                          )
                        }
                      }}
                    />
                    <Select
                      size="small"
                      variant="borderless"
                      className="price-compare-supplier"
                      value={ctx.getInput(brand.name, current.id)?.supplierId}
                      placeholder={t('priceCompare.sheet.supplier')}
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      options={ctx.supplierOptions}
                      onChange={(value) => {
                        const option = ctx.supplierOptions.find(
                          (item) => item.value === value,
                        )
                        ctx.setSupplier(
                          brand.name,
                          current.id,
                          value
                            ? {
                                value: String(value),
                                label: option?.label ?? String(value),
                              }
                            : undefined,
                        )
                      }}
                    />
                  </Flex>
                )
                return isFirst ? <span ref={ctx.spotRef}>{input}</span> : input
              },
            ),
            cellOf(
              t('priceCompare.sheet.columns.diff'),
              SHEET_COLUMN_WIDTH.diff,
              (_, row) => {
                const price = isCategoryEnabled(brand, row.row.category)
                  ? netPriceWithFallback(
                      data,
                      refDate,
                      refPeriod,
                      brand.name,
                      row.row,
                      lengthPremium,
                      allowHrb400eFallback,
                    ).value
                  : undefined
                const spot = getSpot(brand.name, row.row.id)
                if (price === undefined || spot === undefined) {
                  return (
                    <div className="price-compare-num price-compare-sub">-</div>
                  )
                }
                const diff = price - spot - brand.freight
                const cls =
                  diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : 'is-zero'
                const best = bestOf(row)
                return (
                  <Tooltip
                    title={
                      diff >= 0
                        ? t('priceCompare.sheet.spotBetter')
                        : t('priceCompare.sheet.netBetter')
                    }
                  >
                    <span
                      className={`price-compare-diff ${cls}${best === brand.name ? ' is-best' : ''}${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff}
                    </span>
                  </Tooltip>
                )
              },
            ),
          ],
        },
      ],
    ),
    {
      // 填充列: 宽窗口时吸收剩余宽度, 避免商品列被拉伸
      key: '__filler__',
      title: '',
      align: 'left',
      render: () => null,
    },
  ]
}

/* ------------------------------------------------------------- 单据表格 */

type SheetTableProps = {
  rows: PriceRow[]
  base: Omit<
    ColumnContext,
    'rows' | 'onRowDragStart' | 'onRowDragEnd' | 'toggleAll' | 'attachSpotRef'
  > & { density: 'small' | 'middle' | 'large' }
  onReorderRow: (fromId: string, toId: string, after: boolean) => void
  onAddRow: () => void
}

function SheetTable(props: SheetTableProps) {
  const { rows, base, onReorderRow, onAddRow } = props
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [dropAfter, setDropAfter] = useState(false)
  const { toggleSelect, t } = base

  const onRowDragStart = (
    rowId: string,
    event: React.DragEvent<HTMLElement>,
  ) => {
    setDragId(rowId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/row-id', rowId)
    const tr = event.currentTarget.closest('tr')
    if (tr) event.dataTransfer.setDragImage(tr, 24, tr.offsetHeight / 2)
  }
  const onRowDragEnd = () => {
    setDragId(null)
    setDropId(null)
    setDropAfter(false)
  }

  const columns = buildSheetColumns({
    ...base,
    rows,
    attachSpotRef: true,
    onRowDragStart,
    onRowDragEnd,
    toggleAll: (checked) => {
      for (const row of rows) toggleSelect(row.id, checked)
    },
  })
  const dataSource = useMemo<GridRow[]>(
    () => rows.map((row) => ({ key: row.id, rowId: row.id, row })),
    [rows],
  )

  return (
    <Table<GridRow>
      className="price-compare-table"
      size={base.density}
      bordered
      tableLayout="fixed"
      rowKey="key"
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={5 + base.brands.length * 3}>
            <Button
              type="text"
              size="small"
              block
              className="price-compare-add-row"
              onClick={onAddRow}
            >
              {t('priceCompare.sheet.addRow')}
            </Button>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
      rowClassName={(row) => {
        const classes: string[] = []
        if (row.rowId === dragId) classes.push('price-compare-dragging')
        if (dragId && row.rowId === dropId && row.rowId !== dragId)
          classes.push(
            dropAfter
              ? 'price-compare-drop-after'
              : 'price-compare-drop-before',
          )
        return classes.join(' ')
      }}
      onRow={(row) => ({
        onDragOver: (event) => {
          if (!dragId) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          const rect = event.currentTarget.getBoundingClientRect()
          const after = event.clientY > rect.top + rect.height / 2
          if (dropId !== row.rowId || dropAfter !== after) {
            setDropId(row.rowId)
            setDropAfter(after)
          }
        },
        onDrop: (event) => {
          event.preventDefault()
          const fromId = event.dataTransfer.getData('text/row-id')
          if (fromId) onReorderRow(fromId, row.rowId, dropAfter)
          onRowDragEnd()
        },
      })}
      scroll={{
        x:
          SHEET_COLUMN_WIDTH.category +
          SHEET_COLUMN_WIDTH.spec +
          SHEET_COLUMN_WIDTH.ton +
          base.brands.length *
            (SHEET_COLUMN_WIDTH.net +
              SHEET_COLUMN_WIDTH.spot +
              SHEET_COLUMN_WIDTH.diff),
      }}
    />
  )
}

/* ---------------------------------------------------------------- 顶部栏 */

function SheetHeader({
  sheet,
  refDate,
  refPeriod,
  patchSheet,
  periods,
  onRefresh,
  refreshing,
  onOpenConfig,
  availability,
  bestOn,
  onToggleBest,
  selectedCount,
  onRemoveSelected,
  designatedBrands,
  remark,
  onRemarkChange,
  allowHrb400eFallback = false,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  periods: string[]
  onRefresh: () => void
  refreshing: boolean
  onOpenConfig?: () => void
  availability: Record<string, string[]>
  bestOn: boolean
  onToggleBest: () => void
  selectedCount: number
  onRemoveSelected: () => void
  designatedBrands?: string[]
  remark?: string
  onRemarkChange?: (value: string) => void
  allowHrb400eFallback?: boolean
}) {
  const { t } = useTranslation()
  const dateFormat = t('priceCompare.sheet.dateFormat')
  return (
    <Flex vertical gap={8} className="price-compare-toolbar">
      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
        <Flex gap="small" align="center" wrap="wrap">
          <Text strong>
            {sheet.projectName || t('priceCompare.sheet.unspecifiedProject')}
          </Text>
          <Space size="small">
            <Text type="secondary" className="price-compare-sub">
              {t('priceCompare.sheet.orderDate')}
            </Text>
            <DatePicker
              size="small"
              style={{ width: 132 }}
              value={sheet.orderDate ? dayjs(sheet.orderDate) : null}
              format={dateFormat}
              allowClear={false}
              onChange={(value) =>
                value &&
                patchSheet(sheet.id, { orderDate: value.format('YYYY-MM-DD') })
              }
            />
          </Space>
          <Space size="small">
            <Tooltip title={t('priceCompare.sheet.refDateTooltip')}>
              <Text type="secondary" className="price-compare-sub">
                <InfoCircleOutlined /> {t('priceCompare.sheet.refPrice')}
              </Text>
            </Tooltip>
            <DatePicker
              size="small"
              style={{ width: 132 }}
              value={refDate ? dayjs(refDate) : null}
              format={dateFormat}
              allowClear={false}
              disabled={Boolean(sheet.locked)}
              cellRender={(current, info) => {
                if (info.type !== 'date') return info.originNode
                const key = (current as dayjs.Dayjs).format('YYYY-MM-DD')
                const periods = availability[key] ?? []
                return (
                  <div className="price-compare-cal-cell">
                    {info.originNode}
                    <div className="price-compare-cal-dots">
                      {['上午', '中午', '下午'].map((period) => (
                        <i
                          key={period}
                          className={periods.includes(period) ? 'is-on' : ''}
                        />
                      ))}
                    </div>
                  </div>
                )
              }}
              onChange={(value) => {
                if (!value) return
                patchSheet(sheet.id, { refDate: value.format('YYYY-MM-DD') })
              }}
            />
            <Select
              size="small"
              style={{ width: 110 }}
              value={refPeriod || undefined}
              disabled={Boolean(sheet.locked)}
              onChange={(value) => patchSheet(sheet.id, { refPeriod: value })}
              options={periods.map((period) => ({
                value: period,
                label: period,
              }))}
            />
          </Space>
          {allowHrb400eFallback ? (
            <Tooltip title={t('priceCompare.sheet.fallbackTooltip')}>
              <Space size={4} align="center">
                <span className="price-compare-fallback-badge">E</span>
                <Text type="secondary" className="price-compare-sub">
                  {t('priceCompare.sheet.fallbackLegend')}
                </Text>
              </Space>
            </Tooltip>
          ) : null}
        </Flex>

        <Space size={4} wrap>
          <Tooltip
            title={
              sheet.locked
                ? t('priceCompare.sheet.unlockRefTooltip')
                : t('priceCompare.sheet.lockRefTooltip')
            }
          >
            <Button
              size="small"
              type={sheet.locked ? 'primary' : 'default'}
              icon={sheet.locked ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => patchSheet(sheet.id, { locked: !sheet.locked })}
            >
              {sheet.locked
                ? t('priceCompare.sheet.unlockRef')
                : t('priceCompare.sheet.lockRef')}
            </Button>
          </Tooltip>
          <Button
            size="small"
            type={bestOn ? 'primary' : 'default'}
            icon={<TrophyOutlined />}
            onClick={onToggleBest}
          >
            {t('priceCompare.sheet.bestDiff')}
          </Button>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={onRefresh}
          >
            {t('priceCompare.sheet.refreshPrice')}
          </Button>
          {onOpenConfig ? (
            <Button
              size="small"
              icon={<SettingOutlined />}
              onClick={onOpenConfig}
            >
              {t('priceCompare.sheet.config')}
            </Button>
          ) : null}
          {selectedCount > 0 ? (
            <Popconfirm
              title={t('priceCompare.sheet.removeSelectedTitle', {
                selected: selectedCount,
              })}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              onConfirm={onRemoveSelected}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      </Flex>

      <Flex
        gap="small"
        align="center"
        wrap="wrap"
        className="price-compare-meta-row"
      >
        <LockableField
          label={t('priceCompare.sheet.remark')}
          value={remark ?? ''}
          width={220}
          onConfirm={(value) => onRemarkChange?.(value)}
        />
        <Space size={4} align="center" className="price-compare-meta-field">
          <span className="price-compare-sub">
            {t('priceCompare.config.designatedBrands')}
          </span>
          {designatedBrands?.length ? (
            <Flex gap={4} wrap="wrap" align="center">
              {designatedBrands.map((brand) => (
                <Tag key={brand} color="blue" style={{ marginInlineEnd: 0 }}>
                  {brand}
                </Tag>
              ))}
            </Flex>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Space>
      </Flex>
    </Flex>
  )
}

/* ------------------------------------------------------------------- 主体 */

type Props = {
  sheet: PriceSheet
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  density: 'small' | 'middle' | 'large'
  lengthPremium: number
  patchSheet: (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  onReorderBrands: (from: number, to: number) => void
  periods: string[]
  onRefresh: () => void
  refreshing?: boolean
  onOpenConfig?: () => void
  allowHrb400eFallback?: boolean
  allowedProducts?: string[]
  availability?: Record<string, string[]>
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
  designatedBrands?: string[]
  remark?: string
  onRemarkChange?: (value: string) => void
  suppliers?: { value: string; label: string }[]
}

/** 单个报单: 一张扁平表格展示全部行, 现货价同品牌/规格/材质/长度自动联动。 */
export function SheetPanel(props: Props) {
  const {
    sheet,
    data,
    varieties,
    brands,
    rows,
    density,
    lengthPremium,
    patchSheet,
    setRows,
    onReorderBrands,
    periods,
    onRefresh,
    refreshing = false,
    onOpenConfig,
    allowHrb400eFallback = false,
    allowedProducts = [],
    availability = {},
    chrome = true,
    spotRef,
    designatedBrands,
    remark,
    onRemarkChange,
    suppliers = [],
  } = props
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bestOn, setBestOn] = useState(false)
  const [spotResetNonce, setSpotResetNonce] = useState(0)
  const { refDate, refPeriod } = resolveRef(data, sheet)
  const varietyByLabel = useMemo(
    () =>
      new Map(
        varieties.map((item) => [
          `${item.category}|${item.material}|${item.spec}|${item.length}`,
          item,
        ]),
      ),
    [varieties],
  )

  const getSpot = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]?.spot
  const patchRow = (rowId: string, patch: Partial<PriceRow>) =>
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )

  /** 现货价联动: 同批次内 品牌+类别+材质+规格+长度 相同则同步。 */
  const setSpot = (
    brandName: string,
    rowId: string,
    value: number | undefined,
  ) => {
    const { inputs, targets } = syncSpotInputs(
      rows,
      sheet.inputs,
      brandName,
      rowId,
      value,
    )
    patchSheet(sheet.id, { inputs })
    const text = value === undefined ? '' : String(value)
    for (const target of targets) {
      if (target.id === rowId) continue
      const input = document.querySelector<HTMLInputElement>(
        `input[data-spot="${brandName}:${target.id}"]`,
      )
      if (input) input.value = text
    }
  }

  const getInput = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]

  /** 记录/清除现货价来源供应商; 无现货也无供应商时删除该输入。 */
  const setSupplier = (
    brandName: string,
    rowId: string,
    option: { value: string; label: string } | undefined,
  ) => {
    const key = `${brandName}:${rowId}`
    const inputs: SheetInputs = { ...sheet.inputs }
    const prev = inputs[key] ?? {}
    if (!option) {
      const {
        supplierId: _supplierId,
        supplierName: _supplierName,
        ...rest
      } = prev
      if (rest.spot === undefined && rest.ton === undefined) {
        delete inputs[key]
      } else {
        inputs[key] = rest
      }
    } else {
      inputs[key] = {
        ...prev,
        supplierId: option.value,
        supplierName: option.label,
      }
    }
    patchSheet(sheet.id, { inputs })
  }

  const toggleSelect = (rowId: string, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? current.includes(rowId)
          ? current
          : [...current, rowId]
        : current.filter((id) => id !== rowId),
    )
  const removeSelected = () => {
    const ids = new Set(selectedIds)
    if (!ids.size) return
    setRows((list) => list.filter((row) => !ids.has(row.id)))
    const nextInputs = { ...sheet.inputs }
    for (const brand of brands) {
      for (const id of ids) {
        delete nextInputs[`${brand.name}:${id}`]
      }
    }
    patchSheet(sheet.id, { inputs: nextInputs })
    setSelectedIds([])
  }

  const reorderRow = (fromId: string, toId: string, after: boolean) =>
    setRows((list) => {
      const from = list.findIndex((row) => row.id === fromId)
      const to = list.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      const insert = from < to ? (after ? to : to - 1) : after ? to + 1 : to
      return moveItem(list, from, insert)
    })

  const addRow = () => setRows((list) => [...list, makeRow()])

  const base = {
    sheet,
    t,
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    varieties,
    brands,
    density,
    getSpot,
    setSpot,
    getInput,
    setSupplier,
    supplierOptions: suppliers,
    patchRow,
    onReorderBrands,
    selectedIds,
    toggleSelect,
    allowHrb400eFallback,
    allowedProducts,
    bestOn,
    spotResetNonce,
    onInvalidSpot: () => setSpotResetNonce((nonce) => nonce + 1),
    spotRef,
  }

  const content = (
    <>
      <SheetHeader
        sheet={sheet}
        refDate={refDate}
        refPeriod={refPeriod}
        patchSheet={patchSheet}
        periods={periods}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onOpenConfig={onOpenConfig}
        availability={availability}
        bestOn={bestOn}
        onToggleBest={() => setBestOn((value) => !value)}
        selectedCount={selectedIds.length}
        onRemoveSelected={removeSelected}
        designatedBrands={designatedBrands}
        remark={remark}
        onRemarkChange={onRemarkChange}
        allowHrb400eFallback={allowHrb400eFallback}
      />

      <SheetTable
        rows={rows}
        base={{
          ...base,
          moveFocus: moveFocus(rows),
          moveFocusTon: moveFocusTon(rows),
        }}
        onReorderRow={reorderRow}
        onAddRow={addRow}
      />
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
