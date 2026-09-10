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
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { message } from '@/utils/antd-app'
import {
  bestBrandOfRow,
  CATEGORIES,
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
    onRowDragStart,
    onRowDragEnd,
    onReorderBrands,
  } = ctx
  const varietyOptions = buildVarietyOptions(ctx.varieties)
  const selectableRows = rows.map((row) => row.id)
  const allChecked = selectableRows.length > 0 && allSelected
  const someChecked = someSelected && !allChecked
  const isDimmed = (row: GridRow, brandName: string) => {
    if (!bestOn) return false
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
      render: (_, row) => (
        <Checkbox
          checked={selectedIds.includes(row.rowId)}
          disabled={locked}
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
          title="拖拽调整行顺序"
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
  onOpenSettings,
  bestOn,
  onToggleBest,
  selectedCount,
  onRemoveSelected,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  data: PriceData | null
  locked: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  onOpenSettings: () => void
  bestOn: boolean
  onToggleBest: () => void
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
      </Flex>

      <Flex
        justify="flex-end"
        align="center"
        wrap="wrap"
        gap={4}
        className="price-compare-actions"
      >
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
        <Button
          size="small"
          icon={locked ? <UnlockOutlined /> : <LockOutlined />}
          onClick={() => patchSheet(sheet.id, { locked: !locked })}
        >
          {locked ? '解锁' : '锁定'}
        </Button>
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
  onOpenSettings: () => void
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
}

/** 单个报单: 顶部按分组标签切换, 表格仅显示当前分组。 */
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
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState(
    sheet.groups[0]?.id ?? '',
  )
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

  useEffect(() => {
    if (!sheet.groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(sheet.groups[0]?.id ?? '')
    }
  }, [sheet.groups, selectedGroupId])

  const currentGroup =
    sheet.groups.find((group) => group.id === selectedGroupId) ??
    sheet.groups[0]
  const groupRows = useMemo(
    () => rows.filter((row) => row.groupId === currentGroup?.id),
    [rows, currentGroup?.id],
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

  const toggleSelect = (rowId: string, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? current.includes(rowId)
          ? current
          : [...current, rowId]
        : current.filter((id) => id !== rowId),
    )
  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? groupRows.map((row) => row.id) : [])
  const removeSelected = () => {
    const ids = new Set(selectedIds)
    if (!ids.size) return
    setRows((list) => list.filter((row) => !ids.has(row.id)))
    setSelectedIds([])
  }

  const moveFocus = (brandName: string, rowId: string, delta: number) => {
    const index = groupRows.findIndex((row) => row.id === rowId)
    const target = groupRows[index + delta]
    if (!target) return
    const input = document.querySelector<HTMLInputElement>(
      `[data-spot="${brandName}:${target.id}"] input`,
    )
    input?.focus()
    input?.select()
  }

  const reorderRow = (fromId: string, toId: string, after: boolean) =>
    setRows((list) => {
      const inGroup = list.filter((row) => row.groupId === currentGroup?.id)
      const others = list.filter((row) => row.groupId !== currentGroup?.id)
      const from = inGroup.findIndex((row) => row.id === fromId)
      const to = inGroup.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      const insert = from < to ? (after ? to : to - 1) : after ? to + 1 : to
      return [...others, ...moveItem(inGroup, from, insert)]
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
    setSelectedGroupId(group.id)
  }
  const addRow = () =>
    setRows((list) => [...list, makeRow(currentGroup?.id ?? '')])
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
    rows: groupRows,
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
    allSelected:
      selectedIds.length > 0 && selectedIds.length === groupRows.length,
    someSelected: selectedIds.length > 0,
    spotRef,
  })
  const dataSource = useMemo<GridRow[]>(
    () => groupRows.map((row) => ({ key: row.id, rowId: row.id, row })),
    [groupRows],
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
        onOpenSettings={onOpenSettings}
        bestOn={bestOn}
        onToggleBest={() => setBestOn((value) => !value)}
        selectedCount={selectedIds.length}
        onRemoveSelected={removeSelected}
      />

      <Flex
        justify="space-between"
        align="center"
        wrap="wrap"
        gap={8}
        className="price-compare-groupbar"
      >
        <Flex gap={8} align="center" wrap="wrap">
          <Text type="secondary" style={{ fontSize: 12 }}>
            分组
          </Text>
          <Segmented
            value={currentGroup?.id}
            onChange={(value) => setSelectedGroupId(String(value))}
            options={sheet.groups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
          />
        </Flex>
        <Space size={4}>
          <Button size="small" disabled={locked} onClick={addGroup}>
            ＋分组
          </Button>
          <Button
            size="small"
            disabled={locked}
            onClick={() => {
              setRenameValue(currentGroup?.name ?? '')
              setRenameOpen(true)
            }}
          >
            重命名
          </Button>
          <Popconfirm
            title="删除该分组及其行？"
            okText="删除"
            cancelText="取消"
            disabled={locked || sheet.groups.length <= 1}
            onConfirm={() => currentGroup && removeGroup(currentGroup.id)}
          >
            <Button
              size="small"
              danger
              disabled={locked || sheet.groups.length <= 1}
            >
              删除分组
            </Button>
          </Popconfirm>
          <Button size="small" disabled={locked} onClick={addRow}>
            ＋规格行
          </Button>
        </Space>
      </Flex>

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
            if (fromId) reorderRow(fromId, row.rowId, dropAfter)
            onRowDragEnd()
          },
        })}
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

      <Modal
        open={renameOpen}
        title="重命名分组"
        okText="保存"
        cancelText="取消"
        onOk={() => {
          const name = renameValue.trim()
          if (name && currentGroup) renameGroup(currentGroup.id, name)
          setRenameOpen(false)
        }}
        onCancel={() => setRenameOpen(false)}
      >
        <Input
          value={renameValue}
          maxLength={20}
          placeholder="分组名称"
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={() => {
            const name = renameValue.trim()
            if (name && currentGroup) renameGroup(currentGroup.id, name)
            setRenameOpen(false)
          }}
        />
      </Modal>
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
