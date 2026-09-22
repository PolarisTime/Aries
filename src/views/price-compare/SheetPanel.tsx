import {
  DeleteOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MinusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TrophyOutlined,
  UnlockOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Flex,
  Input,
  Popconfirm,
  Popover,
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
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import {
  CATEGORIES,
  fillSupplierInputs,
  filterSupplierOptionsByBrand,
  isSeparatorRow,
  makeRow,
  makeSeparatorRow,
  moveItem,
  netPriceWithFallback,
  resolveRef,
  SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
  type SupplierSelectOption,
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

/** 供应商简称下拉: 支持中文原文 + 拼音全拼/首字母索引。 */
const filterSupplierOption = createPinyinFilterOption()

/**
 * 按方向在行内移动焦点并跳过无法聚焦的中间行(如隔断行缺少输入框),
 * 保证 Tab/Enter/方向键能穿过隔断继续定位到下一可编辑行。
 */
function moveFocusBy(
  orderedRows: PriceRow[],
  rowId: string,
  delta: number,
  selectorOf: (row: PriceRow) => string,
) {
  if (delta === 0) return
  const index = orderedRows.findIndex((row) => row.id === rowId)
  if (index < 0) return
  for (let i = index + delta; i >= 0 && i < orderedRows.length; i += delta) {
    const input = document.querySelector<HTMLInputElement>(
      selectorOf(orderedRows[i]),
    )
    if (!input) continue
    input.focus()
    input.select()
    return
  }
}

function moveFocus(orderedRows: PriceRow[]) {
  return (brandName: string, rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-spot="${brandName}:${row.id}"]`,
    )
}

function moveFocusTon(orderedRows: PriceRow[]) {
  return (rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-ton="${row.id}"]`,
    )
}

/* ------------------------------------------------------------------ 列定义 */

type ColumnContext = {
  sheet: PriceSheet
  t: TFunction
  readOnly: boolean
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
  /** 批量填入供应商: 目标行统一改为该供应商(覆盖已有值); undefined 表示清除。 */
  fillSupplier: (
    brandName: string,
    rowIds: string[],
    option: { value: string; label: string } | undefined,
  ) => void
  supplierOptions: SupplierSelectOption[]
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
  /** 仅临时列显隐: 是否隐藏备注列 */
  hideRemark: boolean
  /** 仅临时列显隐: 整组隐藏的品牌名 */
  hiddenBrands: string[]
  /** 可见品牌列组数量(已排除隐藏品牌), 供 summary colSpan 与 scroll.x 复用 */
  visibleBrandCount: number
}

const cellOf = (
  title: React.ReactNode,
  width: number,
  render: (value: unknown, row: GridRow) => React.ReactNode,
) => ({
  title,
  width,
  align: 'center' as const,
  // 隔断行不参与网价/现货/差价/供应商等任一品牌列
  render: (value: unknown, row: GridRow) =>
    isSeparatorRow(row.row) ? null : render(value, row),
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
    supplierOptions,
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
    readOnly,
    sheet,
    hideRemark,
    hiddenBrands,
  } = ctx
  /** 可见品牌(O(1) 查找)。 */
  const hiddenBrandSet = new Set(hiddenBrands)
  /** 商品行 id(排除隔断行), 供整列批量填入复用。 */
  const productRowIds = rows.flatMap((row) =>
    isSeparatorRow(row) ? [] : [row.id],
  )
  /** 锁定规格和数量: 一并禁掉行级增删与拖拽重排(会间接改变规格/数量顺序)。 */
  const quantityLocked = Boolean(sheet.specQuantityLocked)
  const rowInteractionLocked = readOnly || quantityLocked
  const rowLockedHint = t('priceCompare.sheet.specQuantityLockedHint')
  /** 仅由「锁定规格和数量」触发: 保持不可编辑, 但仍以正常文字色显示已保存值。 */
  const quantityLockClass =
    quantityLocked && !readOnly ? 'price-compare-locked-field' : undefined
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
  /** 报单吨位合计: 当前单据全部商品行 ton 之和。 */
  const tonTotal = rows.reduce((sum, row) => sum + (row.ton ?? 0), 0)
  const tonTotalText = Number.isFinite(tonTotal)
    ? String(Number(tonTotal.toFixed(8)))
    : '0'

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
        <Tooltip title={rowInteractionLocked ? rowLockedHint : undefined}>
          <span
            className={`price-compare-row-drag${rowInteractionLocked ? ' price-compare-row-drag-disabled' : ''}`}
            draggable={!rowInteractionLocked}
            aria-disabled={rowInteractionLocked}
            title={
              rowInteractionLocked
                ? rowLockedHint
                : t('priceCompare.sheet.dragRow')
            }
            onDragStart={(event) => {
              if (rowInteractionLocked) return
              onRowDragStart(row.rowId, event)
            }}
            onDragEnd={onRowDragEnd}
          >
            <HolderOutlined />
          </span>
        </Tooltip>
      ),
    },
    ...(hideRemark
      ? []
      : [
          {
            title: t('priceCompare.sheet.columns.remark'),
            dataIndex: 'remark',
            width: SHEET_COLUMN_WIDTH.remark,
            fixed: 'left' as const,
            align: 'center' as const,
            render: (_: unknown, row: GridRow) =>
              isSeparatorRow(row.row) ? null : (
                <Input
                  key={`remark:${row.rowId}:${row.row.remark ?? ''}`}
                  className="price-compare-row-remark"
                  size="small"
                  variant="borderless"
                  disabled={readOnly}
                  maxLength={255}
                  defaultValue={row.row.remark ?? ''}
                  onBlur={(event) =>
                    patchRow(row.rowId, {
                      remark: event.target.value || undefined,
                    })
                  }
                  onPressEnter={(event) => {
                    patchRow(row.rowId, {
                      remark:
                        (event.target as HTMLInputElement).value || undefined,
                    })
                  }}
                />
              ),
          },
        ]),
    {
      title: t('priceCompare.sheet.columns.category'),
      dataIndex: 'category',
      width: SHEET_COLUMN_WIDTH.category,
      fixed: 'left',
      align: 'center',
      render: (_, row) =>
        isSeparatorRow(row.row) ? (
          <span className="price-compare-separator-label">
            {t('priceCompare.sheet.separator')}
          </span>
        ) : (
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
        if (isSeparatorRow(current)) return null
        const value =
          current && current.material
            ? `${current.category}|${current.material}|${current.spec}|${current.length}`
            : undefined
        return (
          <Select
            size="small"
            variant="borderless"
            className={quantityLockClass}
            disabled={readOnly || Boolean(sheet.specQuantityLocked)}
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
      title: (
        <span className="price-compare-ton-header">
          <span>{t('priceCompare.sheet.columns.ton')}</span>
          <span className="price-compare-ton-total">
            {t('priceCompare.sheet.tonTotal')}: {tonTotalText}
          </span>
        </span>
      ),
      width: SHEET_COLUMN_WIDTH.ton,
      fixed: 'left',
      align: 'center',
      render: (_, row) =>
        isSeparatorRow(row.row) ? null : (
          <Input
            key={`ton:${row.rowId}:${row.row.ton ?? ''}`}
            className={
              quantityLockClass
                ? 'price-compare-ton price-compare-locked-field'
                : 'price-compare-ton'
            }
            size="small"
            variant="borderless"
            inputMode="decimal"
            disabled={readOnly || Boolean(sheet.specQuantityLocked)}
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
      (brand, brandIndex): ColumnsType<GridRow> =>
        hiddenBrandSet.has(brand.name)
          ? []
          : [
              {
                title: (
                  <span
                    className="price-compare-brand-name price-compare-drag"
                    draggable
                    title={t('priceCompare.sheet.dragBrand')}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(
                        'text/plain',
                        String(brandIndex),
                      )
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      const from = Number(
                        event.dataTransfer.getData('text/plain'),
                      )
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
                      const resolved = isCategoryEnabled(
                        brand,
                        row.row.category,
                      )
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
                        <div className="price-compare-num price-compare-sub">
                          -
                        </div>
                      ) : (
                        <div
                          className={`price-compare-net price-compare-num${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}${resolved.fallback ? ' price-compare-fallback' : ''}`}
                        >
                          {resolved.fallback ? (
                            <Tooltip
                              title={t('priceCompare.sheet.fallbackTooltip')}
                            >
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
                        <Input
                          key={`${brand.name}:${current.id}:${spot ?? ''}:${ctx.spotResetNonce}`}
                          className={`price-compare-spot${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                          size="small"
                          variant="borderless"
                          inputMode="decimal"
                          disabled={readOnly}
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
                      )
                      return isFirst ? (
                        <span ref={ctx.spotRef}>{input}</span>
                      ) : (
                        input
                      )
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
                          <div className="price-compare-num price-compare-sub">
                            -
                          </div>
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
                  cellOf(
                    <SupplierFillHeader
                      brandName={brand.name}
                      options={supplierOptions}
                      disabled={readOnly}
                      onFill={(option) =>
                        ctx.fillSupplier(brand.name, productRowIds, option)
                      }
                    />,
                    SHEET_COLUMN_WIDTH.supplier,
                    (_, row) => {
                      const current = row.row
                      const input = ctx.getInput(brand.name, current.id)
                      const supplierName = input?.supplierName
                      const filtered = filterSupplierOptionsByBrand(
                        ctx.supplierOptions,
                        brand.name,
                      )
                      // 保留已选供应商: 若其不属于当前品牌过滤结果, 仍加入选项避免回显丢失,
                      // 不强制清空用户已选值。
                      const options =
                        input?.supplierId &&
                        !filtered.some(
                          (item) => item.value === input.supplierId,
                        )
                          ? [
                              {
                                value: input.supplierId,
                                label: supplierName || input.supplierId,
                                brands: [],
                              },
                              ...filtered,
                            ]
                          : filtered
                      return (
                        <Select
                          size="small"
                          variant="borderless"
                          className={`price-compare-supplier${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                          disabled={readOnly}
                          value={input?.supplierId}
                          title={supplierName}
                          placeholder={t('priceCompare.sheet.supplier')}
                          allowClear
                          showSearch={{ filterOption: filterSupplierOption }}
                          options={options}
                          onChange={(value) => {
                            const option = options.find(
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
  onAddSeparator: () => void
}

function SheetTable(props: SheetTableProps) {
  const { rows, base, onReorderRow, onAddRow, onAddSeparator } = props
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [dropAfter, setDropAfter] = useState(false)
  const { toggleSelect, t } = base
  /** 只读或被他人签出 / 锁定规格数量时: 禁止行级拖拽重排与新增。 */
  const rowLocked = base.readOnly || Boolean(base.sheet.specQuantityLocked)
  const rowLockedHint = t('priceCompare.sheet.specQuantityLockedHint')

  const onRowDragStart = (
    rowId: string,
    event: React.DragEvent<HTMLElement>,
  ) => {
    if (rowLocked) return
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
          <Table.Summary.Cell
            index={0}
            colSpan={(base.hideRemark ? 5 : 6) + base.visibleBrandCount * 4}
          >
            <Flex gap="small" align="center">
              <Button
                type="text"
                size="small"
                block
                className="price-compare-add-row"
                disabled={rowLocked}
                onClick={onAddRow}
              >
                {t('priceCompare.sheet.addRow')}
              </Button>
              <Tooltip
                title={
                  !base.readOnly && base.sheet.specQuantityLocked
                    ? rowLockedHint
                    : undefined
                }
              >
                <Button
                  type="text"
                  size="small"
                  block
                  className="price-compare-add-separator"
                  icon={<MinusOutlined />}
                  disabled={rowLocked}
                  onClick={onAddSeparator}
                >
                  {t('priceCompare.sheet.addSeparator')}
                </Button>
              </Tooltip>
            </Flex>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
      rowClassName={(row) => {
        const classes: string[] = []
        if (isSeparatorRow(row.row)) classes.push('price-compare-separator-row')
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
          if (!dragId || rowLocked) return
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
          if (rowLocked) {
            onRowDragEnd()
            return
          }
          const fromId = event.dataTransfer.getData('text/row-id')
          if (fromId) onReorderRow(fromId, row.rowId, dropAfter)
          onRowDragEnd()
        },
      })}
      scroll={{
        x:
          (base.hideRemark ? 0 : SHEET_COLUMN_WIDTH.remark) +
          SHEET_COLUMN_WIDTH.category +
          SHEET_COLUMN_WIDTH.spec +
          SHEET_COLUMN_WIDTH.ton +
          base.visibleBrandCount *
            (SHEET_COLUMN_WIDTH.net +
              SHEET_COLUMN_WIDTH.spot +
              SHEET_COLUMN_WIDTH.diff +
              SHEET_COLUMN_WIDTH.supplier),
      }}
    />
  )
}

/* ---------------------------------------------------------------- 顶部栏 */

/** 列显示设置: 备注列与整组品牌列的临时显隐(不持久化)。 */
function ColumnSettingsButton({
  hideRemark,
  brands,
  hiddenBrands,
  onToggleRemark,
  onToggleBrand,
}: {
  hideRemark: boolean
  brands: Brand[]
  hiddenBrands: string[]
  onToggleRemark: (visible: boolean) => void
  onToggleBrand: (brandName: string, visible: boolean) => void
}) {
  const { t } = useTranslation()
  const hiddenBrandSet = new Set(hiddenBrands)
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Flex vertical gap={4} className="price-compare-column-settings">
          <Checkbox
            checked={!hideRemark}
            onChange={(event) => onToggleRemark(event.target.checked)}
          >
            {t('priceCompare.sheet.columns.remark')}
          </Checkbox>
          {brands.length ? (
            <>
              <Divider className="my-4" />
              <Text type="secondary" className="price-compare-sub">
                {t('priceCompare.sheet.columns.brand')}
              </Text>
              {brands.map((brand) => (
                <Checkbox
                  key={brand.name}
                  checked={!hiddenBrandSet.has(brand.name)}
                  onChange={(event) =>
                    onToggleBrand(brand.name, event.target.checked)
                  }
                >
                  {brand.name}
                </Checkbox>
              ))}
            </>
          ) : null}
        </Flex>
      }
    >
      <Tooltip title={t('priceCompare.sheet.columnSettings')}>
        <Button
          icon={<SettingOutlined />}
          aria-label={t('priceCompare.sheet.columnSettings')}
        />
      </Tooltip>
    </Popover>
  )
}

/**
 * 供应商批量填入下拉: 选择一个供应商后回调; 用于「整列」与「选中行」两个入口。
 * 复用与单元格一致的品牌过滤与拼音搜索。
 */
function SupplierFillSelect({
  brandName,
  options,
  onPick,
}: {
  brandName?: string
  options: SupplierSelectOption[]
  onPick: (option: { value: string; label: string } | undefined) => void
}) {
  const { t } = useTranslation()
  const filtered = brandName
    ? filterSupplierOptionsByBrand(options, brandName)
    : options
  return (
    <Select
      autoFocus
      size="small"
      style={{ width: 180 }}
      className="price-compare-supplier-fill-select"
      placeholder={t('priceCompare.sheet.fillSupplierPick')}
      showSearch={{ filterOption: filterSupplierOption }}
      options={filtered}
      onChange={(value) => {
        const option = filtered.find((item) => item.value === value)
        onPick(
          value
            ? { value: String(value), label: option?.label ?? String(value) }
            : undefined,
        )
      }}
    />
  )
}

/** 品牌列「简称」表头: 一键把所选供应商填到该品牌列全部商品行。 */
function SupplierFillHeader({
  brandName,
  options,
  disabled,
  onFill,
}: {
  brandName: string
  options: SupplierSelectOption[]
  disabled: boolean
  onFill: (option: { value: string; label: string } | undefined) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const title = t('priceCompare.sheet.fillSupplierColumn', { brand: brandName })
  return (
    <span className="price-compare-supplier-header">
      <span>{t('priceCompare.sheet.columns.supplierShort')}</span>
      {disabled ? null : (
        <Popover
          trigger="click"
          placement="bottom"
          open={open}
          onOpenChange={setOpen}
          content={
            <Flex vertical gap={4} className="price-compare-supplier-fill">
              <Text type="secondary" className="price-compare-sub">
                {title}
              </Text>
              <SupplierFillSelect
                brandName={brandName}
                options={options}
                onPick={(option) => {
                  onFill(option)
                  setOpen(false)
                }}
              />
            </Flex>
          }
        >
          <Button
            type="text"
            size="small"
            className="price-compare-supplier-fill-btn"
            icon={<VerticalAlignBottomOutlined />}
            aria-label={title}
          />
        </Popover>
      )}
    </span>
  )
}

/** 批量填入「选中行」: 先选品牌列, 再选供应商; 覆盖所选行已有简称。 */
function SupplierFillSelectedButton({
  brands,
  options,
  selectedCount,
  disabled,
  onFill,
}: {
  brands: Brand[]
  options: SupplierSelectOption[]
  selectedCount: number
  disabled: boolean
  onFill: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
}) {
  const { t } = useTranslation()
  const [brandName, setBrandName] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const title = t('priceCompare.sheet.fillSupplierSelected', {
    count: selectedCount,
  })
  return (
    <Popover
      trigger="click"
      placement="bottom"
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setBrandName(undefined)
      }}
      content={
        <Flex vertical gap={6} className="price-compare-supplier-fill">
          <Text type="secondary" className="price-compare-sub">
            {title}
          </Text>
          <Select
            size="small"
            style={{ width: 220 }}
            className="price-compare-supplier-fill-brand"
            placeholder={t('priceCompare.sheet.fillSupplierBrand')}
            value={brandName}
            options={brands.map((brand) => ({
              value: brand.name,
              label: brand.name,
            }))}
            onChange={(value) => setBrandName(value)}
          />
          <SupplierFillSelect
            brandName={brandName}
            options={options}
            onPick={(option) => {
              if (!brandName) return
              onFill(brandName, option)
              setOpen(false)
            }}
          />
        </Flex>
      }
    >
      <Button
        icon={<VerticalAlignBottomOutlined />}
        disabled={disabled}
        className="price-compare-fill-selected-btn"
      >
        {t('priceCompare.sheet.fillSupplier')}
      </Button>
    </Popover>
  )
}

/** 锁定/解锁参照日期与时段。 */
function LockRefButton({
  sheet,
  readOnly,
  patchSheet,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip
      title={
        sheet.locked
          ? t('priceCompare.sheet.unlockRefTooltip')
          : t('priceCompare.sheet.lockRefTooltip')
      }
    >
      <Button
        type={sheet.locked ? 'primary' : 'default'}
        icon={sheet.locked ? <LockOutlined /> : <UnlockOutlined />}
        disabled={readOnly}
        onClick={() => patchSheet(sheet.id, { locked: !sheet.locked })}
      >
        {sheet.locked
          ? t('priceCompare.sheet.unlockRef')
          : t('priceCompare.sheet.lockRef')}
      </Button>
    </Tooltip>
  )
}

/** 锁定/解锁规格与数量。 */
function LockSpecQuantityButton({
  sheet,
  readOnly,
  patchSheet,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip
      title={
        sheet.specQuantityLocked
          ? t('priceCompare.sheet.unlockSpecQuantityTooltip')
          : t('priceCompare.sheet.lockSpecQuantityTooltip')
      }
    >
      <Button
        type={sheet.specQuantityLocked ? 'primary' : 'default'}
        icon={sheet.specQuantityLocked ? <LockOutlined /> : <UnlockOutlined />}
        disabled={readOnly}
        onClick={() =>
          patchSheet(sheet.id, {
            specQuantityLocked: !sheet.specQuantityLocked,
          })
        }
      >
        {sheet.specQuantityLocked
          ? t('priceCompare.sheet.unlockSpecQuantity')
          : t('priceCompare.sheet.lockSpecQuantity')}
      </Button>
    </Tooltip>
  )
}

/** 选中行后出现的操作: 批量填入供应商 + 删除所选行。 */
function SelectedRowActions({
  brands,
  supplierOptions,
  selectedCount,
  readOnly,
  specQuantityLocked,
  onFillSupplierSelected,
  onRemoveSelected,
}: {
  brands: Brand[]
  supplierOptions: SupplierSelectOption[]
  selectedCount: number
  readOnly: boolean
  specQuantityLocked: boolean
  onFillSupplierSelected: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
  onRemoveSelected: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SupplierFillSelectedButton
        brands={brands}
        options={supplierOptions}
        selectedCount={selectedCount}
        disabled={readOnly || specQuantityLocked}
        onFill={onFillSupplierSelected}
      />
      {readOnly || specQuantityLocked ? (
        <Tooltip
          title={
            !readOnly && specQuantityLocked
              ? t('priceCompare.sheet.specQuantityLockedHint')
              : undefined
          }
        >
          <span>
            <Button danger icon={<DeleteOutlined />} disabled>
              {t('common.delete')}
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Popconfirm
          title={t('priceCompare.sheet.removeSelectedTitle', {
            selected: selectedCount,
          })}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={onRemoveSelected}
        >
          <Button danger icon={<DeleteOutlined />}>
            {t('common.delete')}
          </Button>
        </Popconfirm>
      )}
    </>
  )
}

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
  readOnly = false,
  hideRemark,
  hiddenBrands,
  brands,
  onToggleRemark,
  onToggleBrand,
  supplierOptions,
  onFillSupplierSelected,
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
  readOnly?: boolean
  hideRemark: boolean
  hiddenBrands: string[]
  brands: Brand[]
  onToggleRemark: (visible: boolean) => void
  onToggleBrand: (brandName: string, visible: boolean) => void
  supplierOptions: SupplierSelectOption[]
  onFillSupplierSelected: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
}) {
  const { t } = useTranslation()
  const dateFormat = t('priceCompare.sheet.dateFormat')
  return (
    <Flex vertical gap={8} className="price-compare-toolbar">
      <Flex align="center" wrap="wrap" gap={8}>
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
              disabled={readOnly}
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
              className={
                sheet.locked && !readOnly
                  ? 'price-compare-locked-field'
                  : undefined
              }
              value={refDate ? dayjs(refDate) : null}
              format={dateFormat}
              allowClear={false}
              disabled={readOnly || Boolean(sheet.locked)}
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
              className={
                sheet.locked && !readOnly
                  ? 'price-compare-locked-field'
                  : undefined
              }
              value={refPeriod || undefined}
              disabled={readOnly || Boolean(sheet.locked)}
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
      </Flex>

      <Flex
        gap="small"
        align="center"
        wrap="wrap"
        className="price-compare-meta-row"
      >
        {readOnly ? (
          <Space size={4} align="center" className="price-compare-meta-field">
            <span className="price-compare-sub">
              {t('priceCompare.sheet.remark')}
            </span>
            <Text type="secondary">{remark || '-'}</Text>
          </Space>
        ) : (
          <LockableField
            label={t('priceCompare.sheet.remark')}
            value={remark ?? ''}
            width={220}
            onConfirm={(value) => onRemarkChange?.(value)}
          />
        )}
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

      <Space size={4} wrap className="price-compare-action-row">
        <LockRefButton
          sheet={sheet}
          readOnly={readOnly}
          patchSheet={patchSheet}
        />
        <LockSpecQuantityButton
          sheet={sheet}
          readOnly={readOnly}
          patchSheet={patchSheet}
        />
        <Button
          type={bestOn ? 'primary' : 'default'}
          icon={<TrophyOutlined />}
          onClick={onToggleBest}
        >
          {t('priceCompare.sheet.bestDiff')}
        </Button>
        <Button
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={onRefresh}
        >
          {t('priceCompare.sheet.refreshPrice')}
        </Button>
        <ColumnSettingsButton
          hideRemark={hideRemark}
          brands={brands}
          hiddenBrands={hiddenBrands}
          onToggleRemark={onToggleRemark}
          onToggleBrand={onToggleBrand}
        />
        {onOpenConfig ? (
          <Button icon={<SettingOutlined />} onClick={onOpenConfig}>
            {t('priceCompare.sheet.config')}
          </Button>
        ) : null}
        {selectedCount > 0 ? (
          <SelectedRowActions
            brands={brands}
            supplierOptions={supplierOptions}
            selectedCount={selectedCount}
            readOnly={readOnly}
            specQuantityLocked={Boolean(sheet.specQuantityLocked)}
            onFillSupplierSelected={onFillSupplierSelected}
            onRemoveSelected={onRemoveSelected}
          />
        ) : null}
      </Space>
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
  suppliers?: SupplierSelectOption[]
  /** 被他人签出编辑时只读(禁用编辑类交互) */
  readOnly?: boolean
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
    readOnly = false,
  } = props
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bestOn, setBestOn] = useState(false)
  const [spotResetNonce, setSpotResetNonce] = useState(0)
  /** 仅临时(不持久化)的列显隐: 备注列与整组品牌列。 */
  const [hideRemark, setHideRemark] = useState(false)
  const [hiddenBrands, setHiddenBrands] = useState<string[]>([])
  const hiddenBrandSet = new Set(hiddenBrands)
  /**
   * 本次会话内现货价被改过的单元格键(`品牌:行id`)。
   * 批量填入供应商时只作用于这些行, 避免换第 N 家时误改已定价的其它供应商行。
   */
  const [spotTouchedKeys, setSpotTouchedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const markSpotsTouched = (keys: string[]) => {
    if (!keys.length) return
    setSpotTouchedKeys((current) => {
      const next = new Set(current)
      for (const key of keys) next.add(key)
      return next
    })
  }
  /** 填入完成后消费掉已处理的标记, 避免下一家批量填入时重复命中。 */
  const consumeSpotsTouched = (keys: string[]) => {
    if (!keys.length) return
    setSpotTouchedKeys((current) => {
      const next = new Set(current)
      for (const key of keys) next.delete(key)
      return next
    })
  }
  const toggleBrandVisible = (brandName: string, visible: boolean) =>
    setHiddenBrands((current) =>
      visible
        ? current.filter((name) => name !== brandName)
        : current.includes(brandName)
          ? current
          : [...current, brandName],
    )
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
    // 记录本次会话改过现货价的行: 仅这些行参与后续批量填入供应商。
    markSpotsTouched(targets.map((target) => `${brandName}:${target.id}`))
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

  /**
   * 批量填入供应商: 仅作用于「本次会话内改过现货价」的目标行, 覆盖其已有简称;
   * 未改价的行保留原简称, 避免换第 N 家时误改已定价的其它供应商行。仅改简称, 不动现货价。
   */
  const fillSupplier = (
    brandName: string,
    rowIds: string[],
    option: { value: string; label: string } | undefined,
  ) => {
    const eligibleIds = rowIds.filter((rowId) =>
      spotTouchedKeys.has(`${brandName}:${rowId}`),
    )
    if (!eligibleIds.length) {
      message.info(t('priceCompare.sheet.fillSupplierNoChangedRows'))
      return
    }
    const inputs = fillSupplierInputs(
      rows,
      sheet.inputs,
      brandName,
      eligibleIds,
      option,
    )
    if (inputs !== sheet.inputs) patchSheet(sheet.id, { inputs })
    consumeSpotsTouched(eligibleIds.map((rowId) => `${brandName}:${rowId}`))
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

  const addSeparator = () => setRows((list) => [...list, makeSeparatorRow()])

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
    fillSupplier,
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
    readOnly,
    hideRemark,
    hiddenBrands,
    visibleBrandCount: brands.reduce(
      (count, brand) => (hiddenBrandSet.has(brand.name) ? count : count + 1),
      0,
    ),
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
        readOnly={readOnly}
        hideRemark={hideRemark}
        hiddenBrands={hiddenBrands}
        brands={brands}
        onToggleRemark={(visible) => setHideRemark(!visible)}
        onToggleBrand={toggleBrandVisible}
        supplierOptions={suppliers}
        onFillSupplierSelected={(brandName, option) =>
          fillSupplier(brandName, selectedIds, option)
        }
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
        onAddSeparator={addSeparator}
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
