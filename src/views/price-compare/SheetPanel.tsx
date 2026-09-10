import {
  DeleteOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SettingOutlined,
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
import { useMemo, useState } from 'react'
import { message } from '@/utils/antd-app'
import {
  bestBrandOfRow,
  buildGridRows,
  CATEGORIES,
  computeSummary,
  makeGroup,
  makeRow,
  moveItem,
  netPrice,
  resolveRef,
  SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
} from './core'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
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
  locked: boolean
  getSpot: (brandName: string, rowId: string) => number | undefined
  setInput: (key: string, patch: { spot?: number }) => void
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  moveFocus: (brandName: string, rowId: string, delta: number) => void
  onReorderBrands: (from: number, to: number) => void
  onRowDragStart: (rowId: string, event: React.DragEvent<HTMLElement>) => void
  onRowDragEnd: () => void
  bestOn: boolean
  selectedIds: string[]
  toggleSelect: (rowId: string, checked: boolean) => void
  toggleAll: (checked: boolean) => void
  allSelected: boolean
  someSelected: boolean
  canRemoveGroup: boolean
  onAddRowToGroup: (groupId: string) => void
  onRenameGroup: (groupId: string, name: string) => void
  onRemoveGroup: (groupId: string) => void
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

function buildVarietyOptions(varieties: Variety[]) {
  return CATEGORIES.reduce<
    { label: string; options: { value: string; label: string }[] }[]
  >((groups, category) => {
    const options: { value: string; label: string }[] = []
    for (const item of varieties) {
      if (item.category === category)
        options.push({ value: item.label, label: item.label })
    }
    if (options.length) groups.push({ label: category, options })
    return groups
  }, [])
}

function buildSheetColumns(ctx: ColumnContext): ColumnsType<GridRow> {
  const {
    sheet,
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    brands,
    rows,
    locked,
    getSpot,
    setInput,
    patchRow,
    moveFocus,
    bestOn,
    selectedIds,
    toggleSelect,
    toggleAll,
    allSelected,
    someSelected,
    canRemoveGroup,
    onAddRowToGroup,
    onRenameGroup,
    onRemoveGroup,
    onRowDragStart,
    onRowDragEnd,
    onReorderBrands,
  } = ctx
  const varietyOptions = buildVarietyOptions(ctx.varieties)
  const selectableRows = rows.map((row) => row.id)
  const allChecked = selectableRows.length > 0 && allSelected
  const someChecked = someSelected && !allChecked
  const isDimmed = (row: GridRow, brandName: string) => {
    if (!bestOn || !row.row) return false
    const best = bestBrandOfRow(data, sheet, row.row, brands, lengthPremium)
    return best !== undefined && best !== brandName
  }

  return [
    {
      title: (
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          disabled={locked || selectableRows.length === 0}
          onChange={(event) => toggleAll(event.target.checked)}
        />
      ),
      width: 32,
      fixed: 'left',
      align: 'center',
      onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.isGroup || !row.rowId ? null : (
          <Checkbox
            checked={selectedIds.includes(row.rowId)}
            disabled={locked}
            onChange={(event) =>
              toggleSelect(row.rowId ?? '', event.target.checked)
            }
          />
        ),
    },
    {
      title: '',
      width: 24,
      fixed: 'left',
      align: 'center',
      onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.isGroup || !row.rowId ? null : (
          <span
            className="price-compare-row-drag"
            draggable
            title="拖拽调整行顺序"
            onDragStart={(event) => onRowDragStart(row.rowId ?? '', event)}
            onDragEnd={onRowDragEnd}
          >
            <HolderOutlined />
          </span>
        ),
    },
    {
      title: '商品（类别 / 材质 / 规格 / 长度）',
      dataIndex: 'base',
      width: SHEET_COLUMN_WIDTH.spec,
      fixed: 'left',
      onCell: (row) => (row.isGroup ? { colSpan: 2 + brands.length * 3 } : {}),
      render: (_, row) => {
        if (row.isGroup && row.group) {
          const group = row.group
          return (
            <Flex gap="small" align="center">
              <Input
                size="small"
                variant="borderless"
                style={{ width: 160, fontWeight: 600 }}
                disabled={locked}
                value={group.name}
                onChange={(event) =>
                  onRenameGroup(group.id, event.target.value)
                }
              />
              <Tag>{row.count ?? 0} 行</Tag>
              <Button
                size="small"
                disabled={locked}
                onClick={() => onAddRowToGroup(group.id)}
              >
                ＋行
              </Button>
              <Popconfirm
                title="删除该分组及其行？"
                okText="删除"
                cancelText="取消"
                disabled={locked || !canRemoveGroup}
                onConfirm={() => onRemoveGroup(group.id)}
              >
                <Button
                  size="small"
                  type="text"
                  danger
                  disabled={locked || !canRemoveGroup}
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Flex>
          )
        }
        const current = row.row
        const value = current
          ? varietyByLabel.get(
              `${current.category}|${current.material}|${current.spec}|${current.length}`,
            )?.label
          : undefined
        return (
          <Select
            size="small"
            variant="borderless"
            disabled={locked}
            style={{ width: SHEET_COLUMN_WIDTH.spec - 12 }}
            placeholder="选择商品"
            showSearch={{ optionFilterProp: 'label' }}
            value={value}
            options={varietyOptions}
            onChange={(label) => {
              const target = varietyByLabel.get(label)
              if (!target) return
              patchRow(row.rowId ?? '', {
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
    ...brands.flatMap(
      (brand, brandIndex): ColumnsType<GridRow> => [
        {
          title: (
            <span
              className="price-compare-brand-name price-compare-drag"
              draggable
              title="拖拽调整品牌列顺序"
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
              if (row.isGroup || !row.row) return null
              const price = netPrice(
                data,
                refDate,
                refPeriod,
                brand.name,
                row.row,
                lengthPremium,
              )
              const dim = isDimmed(row, brand.name)
              return price === undefined ? (
                <div
                  className={`price-compare-num price-compare-sub${dim ? ' price-compare-dim' : ''}`}
                >
                  -
                </div>
              ) : (
                <div
                  className={`price-compare-net price-compare-num${dim ? ' price-compare-dim' : ''}`}
                >
                  {price}
                </div>
              )
            }),
            cellOf('现货', SHEET_COLUMN_WIDTH.spot, (_, row) => {
              if (row.isGroup || !row.row) return null
              const current = row.row
              const spot = getSpot(brand.name, current.id)
              const isFirst = brandIndex === 0 && current.id === rows[0]?.id
              const input = (
                <Input
                  className={`price-compare-spot${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                  size="small"
                  variant="borderless"
                  disabled={locked}
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
                      message.warning('现货价超出合理范围')
                      return
                    }
                    setInput(`${brand.name}:${current.id}`, {
                      spot: raw === '' ? undefined : value,
                    })
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
                      setInput(`${brand.name}:${current.id}`, {
                        spot: raw === '' ? undefined : value,
                      })
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
                    }
                  }}
                />
              )
              return isFirst ? <span ref={ctx.spotRef}>{input}</span> : input
            }),
            cellOf('差价', SHEET_COLUMN_WIDTH.diff, (_, row) => {
              if (row.isGroup || !row.row) return null
              const price = netPrice(
                data,
                refDate,
                refPeriod,
                brand.name,
                row.row,
                lengthPremium,
              )
              const spot = getSpot(brand.name, row.row.id)
              if (price === undefined || spot === undefined) {
                return (
                  <div className="price-compare-num price-compare-sub">-</div>
                )
              }
              const diff = price - spot - brand.freight
              const cls = diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : 'is-zero'
              const dim = isDimmed(row, brand.name)
              return (
                <Tooltip title={diff >= 0 ? '现货更划算' : '网价更优'}>
                  <span
                    className={`price-compare-diff ${cls}${dim ? ' price-compare-dim' : ''}`}
                  >
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
      onCell: (row: GridRow) => (row.isGroup ? { colSpan: 0 } : {}),
      render: () => null,
    },
  ]
}

/* ---------------------------------------------------------------- 子组件 */

function SheetHeader({
  sheet,
  refDate,
  refPeriod,
  data,
  locked,
  patchSheet,
  onAddGroup,
  onAddRow,
  onOpenSettings,
  bestOn,
  onToggleBest,
  selectedCount,
  onRemoveSelected,
  summary,
  brandCount,
  lengthPremium,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  lengthPremium: number
  brandCount: number
  data: PriceData | null
  locked: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  onAddGroup: () => void
  onAddRow: () => void
  onOpenSettings: () => void
  bestOn: boolean
  onToggleBest: () => void
  selectedCount: number
  onRemoveSelected: () => void
  summary: ReturnType<typeof computeSummary>
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
              disabled={locked}
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
            <Tooltip title="整组统一使用该日期与时段作为网价基准">
              <Text type="secondary" className="price-compare-sub">
                <InfoCircleOutlined /> 参照网价
              </Text>
            </Tooltip>
            <DatePicker
              size="small"
              disabled={locked}
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
              style={{ width: 104 }}
              disabled={locked}
              value={refPeriod || undefined}
              onChange={(value) => patchSheet(sheet.id, { refPeriod: value })}
              options={Object.keys(data?.[refDate] ?? {}).map((period) => ({
                value: period,
                label: period,
              }))}
            />
          </Space>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
          >
            报价总设置
          </Button>
        </Flex>
        <Space size={4} wrap>
          <Button size="small" disabled={locked} onClick={onAddGroup}>
            ＋分组
          </Button>
          <Button
            size="small"
            type={bestOn ? 'primary' : 'default'}
            onClick={onToggleBest}
          >
            {bestOn ? '取消最优' : '一键最优'}
          </Button>
          {selectedCount > 0 ? (
            <Popconfirm
              title={`删除选中的 ${selectedCount} 行？`}
              okText="删除"
              cancelText="取消"
              disabled={locked}
              onConfirm={onRemoveSelected}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={locked}
              >
                删除
              </Button>
            </Popconfirm>
          ) : null}
          <Button size="small" disabled={locked} onClick={onAddRow}>
            ＋规格行
          </Button>
          <Button
            size="small"
            icon={locked ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => patchSheet(sheet.id, { locked: !locked })}
          >
            {locked ? '解锁' : '锁定'}
          </Button>
        </Space>
      </Flex>

      <Flex gap={12} align="center" wrap="wrap" className="price-compare-stats">
        <Text type="secondary">
          品牌 <Text strong>{brandCount}</Text> 个 · 12米 +{lengthPremium}
        </Text>
        <Text type="secondary">
          已填 <Text strong>{summary.filled}</Text> 格
        </Text>
        <span className="price-compare-legend">
          差价：<i className="is-pos">+ 现货划算</i>
          <i className="is-neg">− 网价更优</i>
        </span>
      </Flex>
    </Flex>
  )
}

function SummaryBar({
  summary,
}: {
  summary: ReturnType<typeof computeSummary>
}) {
  return (
    <div className="price-compare-summary">
      <Text strong>合计</Text>
      <Text type="secondary">已填 {summary.filled} 格</Text>
      <span className="price-compare-legend" style={{ marginLeft: 'auto' }}>
        差价 = 网价 − 现货 − 运费
      </span>
    </div>
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
  onOpenSettings: () => void
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
}

/** 单个报单: 分组 × 商品行 × 品牌列组(网价/现货/差价) 的比价表。 */
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
    onOpenSettings,
    chrome = true,
    spotRef,
  } = props
  const [bestOn, setBestOn] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [dropAfter, setDropAfter] = useState(false)
  const locked = sheet.locked
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
  const setInput = (key: string, patch: { spot?: number }) =>
    patchSheet(sheet.id, {
      inputs: {
        ...sheet.inputs,
        [key]: { ...(sheet.inputs[key] ?? {}), ...patch },
      },
    })
  const patchRow = (rowId: string, patch: Partial<PriceRow>) =>
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )
  const lastGroupId = sheet.groups[sheet.groups.length - 1]?.id ?? ''

  const toggleSelect = (rowId: string, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? current.includes(rowId)
          ? current
          : [...current, rowId]
        : current.filter((id) => id !== rowId),
    )
  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? rows.map((row) => row.id) : [])
  const removeSelected = () => {
    const ids = new Set(selectedIds)
    if (!ids.size) return
    setRows((list) => list.filter((row) => !ids.has(row.id)))
    setSelectedIds([])
  }

  const moveFocus = (brandName: string, rowId: string, delta: number) => {
    const index = rows.findIndex((row) => row.id === rowId)
    const target = rows[index + delta]
    if (!target) return
    const input = document.querySelector<HTMLInputElement>(
      `[data-spot="${brandName}:${target.id}"] input`,
    )
    input?.focus()
    input?.select()
  }

  const reorderRow = (fromId: string, toId: string, after: boolean) =>
    setRows((list) => {
      const from = list.findIndex((row) => row.id === fromId)
      const to = list.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      const insert = from < to ? (after ? to : to - 1) : after ? to + 1 : to
      const targetGroup = list[to].groupId
      return moveItem(list, from, insert).map((row) =>
        row.id === fromId ? { ...row, groupId: targetGroup } : row,
      )
    })

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

  const addGroup = () => {
    const group = makeGroup(`分组 ${sheet.groups.length + 1}`)
    patchSheet(sheet.id, { groups: [...sheet.groups, group] })
    setRows((list) => [...list, makeRow(group.id)])
  }
  const addRowToGroup = (groupId: string) =>
    setRows((list) => [...list, makeRow(groupId)])
  const addRow = () => setRows((list) => [...list, makeRow(lastGroupId)])
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
  }

  const columns = buildSheetColumns({
    sheet,
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    varieties,
    brands,
    rows,
    locked,
    getSpot,
    setInput,
    patchRow,
    moveFocus,
    onReorderBrands,
    onRowDragStart,
    onRowDragEnd,
    bestOn,
    selectedIds,
    toggleSelect,
    toggleAll,
    allSelected: selectedIds.length > 0 && selectedIds.length === rows.length,
    someSelected: selectedIds.length > 0,
    canRemoveGroup: sheet.groups.length > 1,
    onAddRowToGroup: addRowToGroup,
    onRenameGroup: renameGroup,
    onRemoveGroup: removeGroup,
    spotRef,
  })
  const dataSource = useMemo(
    () => buildGridRows(rows, sheet.groups),
    [rows, sheet.groups],
  )
  const summary = computeSummary(
    data,
    { ...sheet, refDate, refPeriod },
    rows,
    brands,
    lengthPremium,
  )

  const content = (
    <>
      <SheetHeader
        sheet={sheet}
        refDate={refDate}
        refPeriod={refPeriod}
        data={data}
        locked={locked}
        patchSheet={patchSheet}
        onAddGroup={addGroup}
        onAddRow={addRow}
        onOpenSettings={onOpenSettings}
        bestOn={bestOn}
        onToggleBest={() => setBestOn((value) => !value)}
        selectedCount={selectedIds.length}
        onRemoveSelected={removeSelected}
        summary={summary}
        brandCount={brands.length}
        lengthPremium={lengthPremium}
      />
      <Table<GridRow>
        className="price-compare-table"
        size={density}
        bordered
        sticky
        tableLayout="fixed"
        rowKey="key"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        rowClassName={(row) => {
          const classes: string[] = []
          if (row.isGroup) classes.push('price-compare-group-row')
          if (row.rowId === dragId) classes.push('price-compare-dragging')
          if (dragId && row.rowId === dropId && row.rowId !== dragId)
            classes.push(
              dropAfter
                ? 'price-compare-drop-after'
                : 'price-compare-drop-before',
            )
          return classes.join(' ')
        }}
        onRow={(row) =>
          row.isGroup || !row.rowId
            ? {}
            : {
                onDragOver: (event) => {
                  if (!dragId) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  const rect = event.currentTarget.getBoundingClientRect()
                  const after = event.clientY > rect.top + rect.height / 2
                  if (dropId !== row.rowId || dropAfter !== after) {
                    setDropId(row.rowId ?? null)
                    setDropAfter(after)
                  }
                },
                onDrop: (event) => {
                  event.preventDefault()
                  const fromId = event.dataTransfer.getData('text/row-id')
                  if (fromId && row.rowId)
                    reorderRow(fromId, row.rowId, dropAfter)
                  onRowDragEnd()
                },
              }
        }
        scroll={{
          x:
            SHEET_COLUMN_WIDTH.spec +
            brands.length *
              (SHEET_COLUMN_WIDTH.net +
                SHEET_COLUMN_WIDTH.spot +
                SHEET_COLUMN_WIDTH.diff),
        }}
        style={{ marginTop: 8 }}
      />
      <SummaryBar summary={summary} />
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
