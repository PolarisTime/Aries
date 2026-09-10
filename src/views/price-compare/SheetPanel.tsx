import {
  CameraOutlined,
  CopyOutlined,
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
  DatePicker,
  Dropdown,
  Flex,
  Input,
  InputNumber,
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
import html2canvas from 'html2canvas'
import { useMemo, useRef, useState } from 'react'
import { message } from '@/utils/antd-app'
import {
  bestBrandOfRow,
  buildGridRows,
  CATEGORIES,
  computeSummary,
  makeRow,
  moveItem,
  netPrice,
  resolveRef,
  SHEET_COLUMN_WIDTH,
  SHEET_STATUS_META,
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
const CAPTURE_BACKGROUND = '#ffffff'

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
  getTon: (rowId: string) => number | undefined
  setInput: (key: string, patch: { ton?: number; spot?: number }) => void
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  moveFocus: (brandName: string, rowId: string, delta: number) => void
  onReorderBrands: (from: number, to: number) => void
  bestOn: boolean
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
    varieties,
    brands,
    rows,
    locked,
    getSpot,
    getTon,
    setInput,
    patchRow,
    moveFocus,
    bestOn,
    onReorderBrands,
    spotRef,
  } = ctx
  const varietyOptions = buildVarietyOptions(varieties)
  const isDimmed = (row: GridRow, brandName: string) => {
    if (!bestOn) return false
    const best = bestBrandOfRow(data, sheet, row.row, brands, lengthPremium)
    return best !== undefined && best !== brandName
  }

  return [
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
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/row-id', row.rowId)
          }}
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
    {
      title: '吨',
      width: SHEET_COLUMN_WIDTH.ton,
      fixed: 'left',
      align: 'right',
      render: (_, row) => (
        <InputNumber
          size="small"
          variant="borderless"
          disabled={locked}
          min={0}
          style={{ width: 58 }}
          defaultValue={getTon(row.rowId)}
          onBlur={(event) => {
            const raw = event.target.value
            setInput(`_:${row.rowId}`, {
              ton: raw === '' ? undefined : Number(raw),
            })
          }}
          onPressEnter={(event) => {
            const raw = (event.target as HTMLInputElement).value
            setInput(`_:${row.rowId}`, {
              ton: raw === '' ? undefined : Number(raw),
            })
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
                    } else if (event.key === 'Tab') {
                      // Tab 交给浏览器/后续逻辑, 提交后移动由 onBlur 完成
                    }
                  }}
                />
              )
              return isFirst ? <span ref={spotRef}>{input}</span> : input
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
  capturing,
  patchSheet,
  capture,
  captureBtnRef,
  onAddRow,
  onCopySheet,
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
  capturing: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  capture: (copy: boolean) => Promise<void>
  captureBtnRef: React.RefObject<HTMLSpanElement | null>
  onAddRow: () => void
  onCopySheet: () => void
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
          <Input
            size="small"
            variant="borderless"
            className="price-compare-sheet-name"
            style={{ width: 140, fontWeight: 600 }}
            disabled={locked}
            value={sheet.name}
            onChange={(event) =>
              patchSheet(sheet.id, { name: event.target.value })
            }
          />
          <Tag color={SHEET_STATUS_META[sheet.status] ?? 'default'}>
            {sheet.status}
          </Tag>
          <Text type="secondary" className="price-compare-sub">
            {sheet.projectName || '未指定项目'}
          </Text>
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
          <Button
            size="small"
            type={bestOn ? 'primary' : 'default'}
            onClick={onToggleBest}
          >
            {bestOn ? '取消最优' : '一键最优'}
          </Button>
          <Popconfirm
            title={`删除选中的 ${selectedCount} 行？`}
            okText="删除"
            cancelText="取消"
            disabled={locked || selectedCount === 0}
            onConfirm={onRemoveSelected}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={locked || selectedCount === 0}
            >
              删除
            </Button>
          </Popconfirm>
          <Button size="small" disabled={locked} onClick={onAddRow}>
            ＋规格行
          </Button>
          <Button size="small" onClick={onCopySheet}>
            复制批次
          </Button>
          <Button
            size="small"
            icon={locked ? <UnlockOutlined /> : <LockOutlined />}
            onClick={() => patchSheet(sheet.id, { locked: !locked })}
          >
            {locked ? '解锁' : '锁定'}
          </Button>
          <span ref={captureBtnRef}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'download',
                    icon: <CameraOutlined />,
                    label: '截图下载',
                  },
                  { key: 'copy', icon: <CopyOutlined />, label: '复制图片' },
                ],
                onClick: ({ key }) => {
                  void capture(key === 'copy')
                },
              }}
            >
              <Button size="small" type="primary" loading={capturing}>
                导出 ▾
              </Button>
            </Dropdown>
          </span>
        </Space>
      </Flex>

      <Flex gap={12} align="center" wrap="wrap" className="price-compare-stats">
        <Text type="secondary">
          品牌 <Text strong>{brandCount}</Text> 个 · 12米 +{lengthPremium}
        </Text>
        <Text>
          总吨数 <Text strong>{summary.totalTon || 0}</Text> 吨
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
      <Text>总吨数 {summary.totalTon || 0}</Text>
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
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  onReorderBrands: (from: number, to: number) => void
  onOpenSettings: () => void
  onCopySheet: () => void
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
  captureBtnRef: React.RefObject<HTMLSpanElement | null>
}

/** 单个报单: 商品行 × 品牌列组(网价/现货/差价) 的比价表。 */
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
    onCopySheet,
    chrome = true,
    spotRef,
    captureBtnRef,
  } = props
  const captureRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
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
  const [bestOn, setBestOn] = useState(false)
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([])
  const locked = sheet.locked

  const getSpot = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]?.spot
  const getTon = (rowId: string) => sheet.inputs[`_:${rowId}`]?.ton
  const setInput = (key: string, patch: { ton?: number; spot?: number }) =>
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
  const removeRows = (rowIds: React.Key[]) => {
    const ids = new Set(rowIds.map(String))
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

  const onReorderRow = (fromId: string, toId: string) =>
    setRows((list) => {
      const from = list.findIndex((row) => row.id === fromId)
      const to = list.findIndex((row) => row.id === toId)
      if (from < 0 || to < 0 || from === to) return list
      return moveItem(list, from, to)
    })

  const onAddRow = () => setRows((list) => [...list, makeRow()])

  const capture = async (copy: boolean) => {
    if (!captureRef.current) return
    setCapturing(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: CAPTURE_BACKGROUND,
        useCORS: true,
      })
      if (copy && navigator.clipboard && window.ClipboardItem) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        )
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ])
          message.success('已复制到剪贴板，可直接粘贴发送')
        }
      } else {
        const link = document.createElement('a')
        link.download = `${sheet.name}_${sheet.orderDate}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        message.success('截图已下载')
      }
    } catch (error) {
      message.error(
        `截图失败：${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      setCapturing(false)
    }
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
    getTon,
    setInput,
    patchRow,
    moveFocus,
    bestOn,
    onReorderBrands,
    spotRef,
  })
  const dataSource = useMemo(() => buildGridRows(rows), [rows])
  const summary = computeSummary(
    data,
    { ...sheet, refDate, refPeriod },
    rows,
    brands,
    lengthPremium,
  )

  const content = (
    <>
      <div ref={captureRef}>
        <SheetHeader
          sheet={sheet}
          refDate={refDate}
          refPeriod={refPeriod}
          data={data}
          locked={locked}
          capturing={capturing}
          patchSheet={patchSheet}
          capture={capture}
          captureBtnRef={captureBtnRef}
          onAddRow={onAddRow}
          onCopySheet={onCopySheet}
          onOpenSettings={onOpenSettings}
          bestOn={bestOn}
          onToggleBest={() => setBestOn((value) => !value)}
          selectedCount={selectedIds.length}
          onRemoveSelected={() => removeRows(selectedIds)}
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
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => setSelectedIds(keys),
            getCheckboxProps: () => ({ disabled: locked }),
          }}
          scroll={{
            x:
              SHEET_COLUMN_WIDTH.spec +
              SHEET_COLUMN_WIDTH.ton +
              brands.length *
                (SHEET_COLUMN_WIDTH.net +
                  SHEET_COLUMN_WIDTH.spot +
                  SHEET_COLUMN_WIDTH.diff),
          }}
          onRow={(row) => ({
            onDragOver: (event) => event.preventDefault(),
            onDrop: (event) => {
              event.preventDefault()
              const fromId = event.dataTransfer.getData('text/row-id')
              if (fromId) onReorderRow(fromId, row.rowId)
            },
          })}
          style={{ marginTop: 8 }}
        />
        <SummaryBar summary={summary} />
      </div>
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
