import {
  DeleteOutlined,
  HolderOutlined,
  InfoCircleOutlined,
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
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { message } from '@/utils/antd-app'
import {
  CATEGORIES,
  makeGroup,
  makeRow,
  moveItem,
  netPriceWithFallback,
  resolveRef,
  SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
  syncSpotInputs,
} from './core'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetGroup,
  Variety,
} from './types'
import './price-compare.css'

const { Text } = Typography
const DATE_FMT = 'YYYY年M月D日'

/* ------------------------------------------------------------------ 列定义 */

type ColumnContext = {
  sheet: PriceSheet
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

/** 精简展示: 类别由分组表头给出, 选项只显示 材质/规格/长度。 */
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
  const varietyOptions = buildVarietyOptions(
    ctx.varieties.filter((item) => enabledCategories.has(item.category)),
  )
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
          title="拖动调整行顺序"
          onDragStart={(event) => onRowDragStart(row.rowId, event)}
          onDragEnd={onRowDragEnd}
        >
          <HolderOutlined />
        </span>
      ),
    },
    {
      title: '类别 / 材质 / 规格 / 长度',
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
            placeholder="选择商品"
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
      title: '报单吨位',
      width: SHEET_COLUMN_WIDTH.ton,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <Input
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
              message.warning('报单吨位需为正数')
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
              title="拖动调整品牌列顺序"
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
            cellOf('网价', SHEET_COLUMN_WIDTH.net, (_, row) => {
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
                <div className="price-compare-net price-compare-num">
                  {resolved.fallback ? `E ${price}` : price}
                </div>
              )
            }),
            cellOf('现货', SHEET_COLUMN_WIDTH.spot, (_, row) => {
              const current = row.row
              const spot = getSpot(brand.name, current.id)
              const isFirst =
                attachSpotRef && brandIndex === 0 && current.id === rows[0]?.id
              const input = (
                <Input
                  className="price-compare-spot"
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
                      message.warning('现货价超出合理范围（0 - 20000）')
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
                      moveFocus(brand.name, current.id, event.shiftKey ? -1 : 1)
                    }
                  }}
                />
              )
              return isFirst ? <span ref={ctx.spotRef}>{input}</span> : input
            }),
            cellOf('差价', SHEET_COLUMN_WIDTH.diff, (_, row) => {
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
              const cls = diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : 'is-zero'
              return (
                <Tooltip title={diff >= 0 ? '现货更划算' : '网价更优'}>
                  <span className={`price-compare-diff ${cls}`}>
                    {diff > 0 ? '+' : ''}
                    {diff}
                  </span>
                </Tooltip>
              )
            }),
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

/* ----------------------------------------------------------- 单个分组表格 */

type GroupTableProps = {
  group: SheetGroup
  rows: PriceRow[]
  canRemove: boolean
  attachSpotRef: boolean
  base: Omit<
    ColumnContext,
    'rows' | 'onRowDragStart' | 'onRowDragEnd' | 'toggleAll' | 'attachSpotRef'
  > & { density: 'small' | 'middle' | 'large' }
  onReorderRow: (
    groupId: string,
    fromId: string,
    toId: string,
    after: boolean,
  ) => void
  onAddRowToGroup: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onRemoveGroup: (groupId: string) => void
}

function GroupTable(props: GroupTableProps) {
  const {
    group,
    rows,
    canRemove,
    attachSpotRef,
    base,
    onReorderRow,
    onAddRowToGroup,
    onRenameGroup,
    onRemoveGroup,
  } = props
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [dropAfter, setDropAfter] = useState(false)
  const { toggleSelect } = base

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
    attachSpotRef,
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
    <div className="price-compare-group">
      <Flex
        align="center"
        gap={4}
        wrap="wrap"
        className="price-compare-group-head"
      >
        <Input
          size="small"
          variant="borderless"
          className="price-compare-group-name"
          style={{ width: 200, fontWeight: 600 }}
          value={group.name}
          onChange={(event) => onRenameGroup(group.id, event.target.value)}
        />
        {canRemove ? (
          <Popconfirm
            title="删除该分组及其全部行？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => onRemoveGroup(group.id)}
          >
            <Button
              size="small"
              type="text"
              danger
              title="删除分组"
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        ) : null}
      </Flex>
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
            <Table.Summary.Cell index={0} colSpan={4 + base.brands.length * 3}>
              <Button
                type="text"
                size="small"
                block
                className="price-compare-add-row"
                onClick={() => onAddRowToGroup(group.id)}
              >
                ＋ 添加一行
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
            if (fromId) onReorderRow(group.id, fromId, row.rowId, dropAfter)
            onRowDragEnd()
          },
        })}
        scroll={{
          x:
            SHEET_COLUMN_WIDTH.spec +
            SHEET_COLUMN_WIDTH.ton +
            base.brands.length *
              (SHEET_COLUMN_WIDTH.net +
                SHEET_COLUMN_WIDTH.spot +
                SHEET_COLUMN_WIDTH.diff),
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- 顶部栏 */

function SheetHeader({
  sheet,
  refDate,
  refPeriod,
  data,
  patchSheet,
  onAddGroup,
  onSyncPrice,
  syncing,
  selectedCount,
  onRemoveSelected,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  data: PriceData | null
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  onAddGroup: () => void
  onSyncPrice: () => void
  syncing: boolean
  selectedCount: number
  onRemoveSelected: () => void
}) {
  return (
    <Flex vertical gap={8}>
      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={8}
        className="price-compare-toolbar"
      >
        <Flex gap="small" align="center" wrap="wrap">
          <Text strong>{sheet.projectName || '未指定项目'}</Text>
          <Space size="small">
            <Text type="secondary" className="price-compare-sub">
              报单日期
            </Text>
            <DatePicker
              size="small"
              style={{ width: 132 }}
              value={sheet.orderDate ? dayjs(sheet.orderDate) : null}
              format={DATE_FMT}
              allowClear={false}
              onChange={(value) =>
                value &&
                patchSheet(sheet.id, { orderDate: value.format('YYYY-MM-DD') })
              }
            />
          </Space>
          <Space size="small">
            <Tooltip title="全部行统一使用该日期与时段作为网价基准">
              <Text type="secondary" className="price-compare-sub">
                <InfoCircleOutlined /> 参照网价
              </Text>
            </Tooltip>
            <DatePicker
              size="small"
              style={{ width: 132 }}
              value={refDate ? dayjs(refDate) : null}
              format={DATE_FMT}
              allowClear={false}
              onChange={(value) => {
                if (!value) return
                const date = value.format('YYYY-MM-DD')
                patchSheet(sheet.id, {
                  refDate: date,
                  refPeriod: Object.keys(data?.[date] ?? {})[0] ?? '',
                })
              }}
            />
            <Select
              size="small"
              style={{ width: 110 }}
              value={refPeriod || undefined}
              onChange={(value) => patchSheet(sheet.id, { refPeriod: value })}
              options={Object.keys(data?.[refDate] ?? {}).map((period) => ({
                value: period,
                label: period,
              }))}
            />
          </Space>
        </Flex>
      </Flex>

      <Flex
        justify="flex-start"
        align="center"
        wrap="wrap"
        gap={4}
        className="price-compare-actions"
      >
        <Button size="small" onClick={onAddGroup}>
          ＋分组
        </Button>
        <Button size="small" loading={syncing} onClick={onSyncPrice}>
          价格同步
        </Button>
        {selectedCount > 0 ? (
          <Popconfirm
            title={`删除选中的 ${selectedCount} 行？`}
            okText="删除"
            cancelText="取消"
            onConfirm={onRemoveSelected}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        ) : null}
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
  onSyncPrice: () => void
  syncing?: boolean
  allowHrb400eFallback?: boolean
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
}

/** 单个报单: 分组在下方堆叠展示, 现货价同品牌/规格/材质/长度自动联动。 */
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
    onSyncPrice,
    syncing = false,
    allowHrb400eFallback = false,
    chrome = true,
    spotRef,
  } = props
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    setSelectedIds([])
  }

  const moveFocus =
    (groupRows: PriceRow[]) =>
    (brandName: string, rowId: string, delta: number) => {
      const index = groupRows.findIndex((row) => row.id === rowId)
      const target = groupRows[index + delta]
      if (!target) return
      const input = document.querySelector<HTMLInputElement>(
        `input[data-spot="${brandName}:${target.id}"]`,
      )
      input?.focus()
      input?.select()
    }

  const moveFocusTon =
    (groupRows: PriceRow[]) => (rowId: string, delta: number) => {
      const index = groupRows.findIndex((row) => row.id === rowId)
      const target = groupRows[index + delta]
      if (!target) return
      const input = document.querySelector<HTMLInputElement>(
        `input[data-ton="${target.id}"]`,
      )
      input?.focus()
      input?.select()
    }

  const reorderRow = (
    groupId: string,
    fromId: string,
    toId: string,
    after: boolean,
  ) =>
    setRows((list) => {
      const inGroup = list.filter((row) => row.groupId === groupId)
      const from = inGroup.findIndex((row) => row.id === fromId)
      const to = inGroup.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      const insert = from < to ? (after ? to : to - 1) : after ? to + 1 : to
      const reordered = moveItem(inGroup, from, insert)
      const known = new Set(sheet.groups.map((group) => group.id))
      const next: PriceRow[] = []
      for (const group of sheet.groups) {
        if (group.id === groupId) next.push(...reordered)
        else next.push(...list.filter((row) => row.groupId === group.id))
      }
      next.push(...list.filter((row) => !known.has(row.groupId)))
      return next
    })

  const addGroup = () => {
    const group = makeGroup(`分组 ${sheet.groups.length + 1}`)
    patchSheet(sheet.id, { groups: [...sheet.groups, group] })
    setRows((list) => [...list, makeRow(group.id)])
  }
  const addRowToGroup = (groupId: string) =>
    setRows((list) => [...list, makeRow(groupId)])
  const renameGroup = (groupId: string, name: string) =>
    patchSheet(
      sheet.id,
      {
        groups: sheet.groups.map((group) =>
          group.id === groupId ? { ...group, name } : group,
        ),
      },
      `group:${groupId}`,
    )
  const removeGroup = (groupId: string) => {
    if (sheet.groups.length <= 1) return
    patchSheet(sheet.id, {
      groups: sheet.groups.filter((group) => group.id !== groupId),
    })
    setRows((list) => list.filter((row) => row.groupId !== groupId))
    setSelectedIds((current) =>
      current.filter((id) =>
        rows.some((row) => row.id === id && row.groupId !== groupId),
      ),
    )
  }

  const base = {
    sheet,
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
    patchRow,
    onReorderBrands,
    selectedIds,
    toggleSelect,
    allowHrb400eFallback,
    spotRef,
  }

  const content = (
    <>
      <SheetHeader
        sheet={sheet}
        refDate={refDate}
        refPeriod={refPeriod}
        data={data}
        patchSheet={patchSheet}
        onAddGroup={addGroup}
        onSyncPrice={onSyncPrice}
        syncing={syncing}
        selectedCount={selectedIds.length}
        onRemoveSelected={removeSelected}
      />

      {sheet.groups.map((group, index) => {
        const groupRows = rows.filter((row) => row.groupId === group.id)
        return (
          <GroupTable
            key={group.id}
            group={group}
            rows={groupRows}
            canRemove={sheet.groups.length > 1}
            attachSpotRef={index === 0}
            base={{
              ...base,
              moveFocus: moveFocus(groupRows),
              moveFocusTon: moveFocusTon(groupRows),
            }}
            onReorderRow={reorderRow}
            onAddRowToGroup={addRowToGroup}
            onRenameGroup={renameGroup}
            onRemoveGroup={removeGroup}
          />
        )
      })}
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
