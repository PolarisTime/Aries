import {
  CameraOutlined,
  CopyOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LockOutlined,
  SettingOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Statistic,
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
  moveItem,
  netPrice,
  SHEET_COLUMN_WIDTH,
} from './core'
import type {
  Brand,
  BrandOption,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  ProjectOption,
  Variety,
} from './types'

const { Text } = Typography
const DATE_FMT = 'YYYY年M月D日'
const MAX_SPOT = 20000

/* ------------------------------------------------------------------ 列定义 */

type ColumnContext = {
  sheet: PriceSheet
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  locked: boolean
  getSpot: (brandName: string, rowId: string) => number | undefined
  getTon: (rowId: string) => number | undefined
  setInput: (key: string, patch: { ton?: number; spot?: number }) => void
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  removeRow: (rowId: string) => void
  moveFocus: (brandName: string, rowId: string, delta: number) => void
  onReorderBrands: (from: number, to: number) => void
  bestGroups: string[]
  onToggleBest: (category: string) => void
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
  onCell: (row: GridRow) => (row.isGroup ? { colSpan: 0 } : {}),
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
    data,
    varieties,
    brands,
    rows,
    locked,
    getSpot,
    getTon,
    setInput,
    patchRow,
    removeRow,
    moveFocus,
    onReorderBrands,
    bestGroups,
    onToggleBest,
    spotRef,
  } = ctx
  const varietyOptions = buildVarietyOptions(varieties)
  const isDimmed = (row: GridRow, brandName: string) => {
    if (!row.row || !bestGroups.includes(row.category)) return false
    const best = bestBrandOfRow(data, sheet, row.row, brands)
    return best !== undefined && best !== brandName
  }

  return [
    {
      title: '商品（类别 / 材质 / 规格 / 长度）',
      dataIndex: 'base',
      width: SHEET_COLUMN_WIDTH.spec,
      fixed: 'left',
      onCell: (row) => (row.isGroup ? { colSpan: 3 + brands.length * 3 } : {}),
      render: (_, row) => {
        if (row.isGroup) {
          const active = bestGroups.includes(row.category)
          return (
            <Flex gap="small" align="center">
              <b>{row.category}</b>
              <Button
                size="small"
                type={active ? 'primary' : 'default'}
                onClick={() => onToggleBest(row.category)}
              >
                {active ? '取消最优' : '一键最优'}
              </Button>
            </Flex>
          )
        }
        const current = row.row
        const value = varieties.find(
          (item) =>
            item.category === current?.category &&
            item.material === current?.material &&
            item.spec === current?.spec &&
            item.length === current?.length,
        )?.label
        return (
          <Select
            size="small"
            variant="borderless"
            disabled={locked}
            style={{ width: '100%' }}
            showSearch={{ optionFilterProp: 'label' }}
            value={value}
            options={varietyOptions}
            onChange={(label) => {
              const target = varieties.find((item) => item.label === label)
              if (target && row.rowId) {
                patchRow(row.rowId, {
                  category: target.category,
                  material: target.material,
                  spec: target.spec,
                  length: target.length,
                })
              }
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
      onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.isGroup || !row.rowId ? null : (
          <InputNumber
            size="small"
            variant="borderless"
            disabled={locked}
            min={0}
            style={{ width: 58 }}
            value={getTon(row.rowId)}
            onChange={(value) =>
              setInput(`_:${row.rowId}`, { ton: value ?? undefined })
            }
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
              ⠿ {brand.name}
            </span>
          ),
          children: [
            cellOf('网价', SHEET_COLUMN_WIDTH.net, (_, row) => {
              if (row.isGroup || !row.row) return null
              const price = netPrice(
                data,
                sheet.refDate,
                sheet.refPeriod,
                brand.name,
                row.row,
                sheet.lengthPremium,
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
                  value={spot === undefined ? '' : String(spot)}
                  onChange={(event) => {
                    const value = event.target.value
                    setInput(`${brand.name}:${current.id}`, {
                      spot: value === '' ? undefined : Number(value),
                    })
                  }}
                  onBlur={(event) => {
                    const value = Number(event.target.value)
                    if (
                      event.target.value !== '' &&
                      (Number.isNaN(value) || value <= 0 || value > MAX_SPOT)
                    ) {
                      message.warning('现货价超出合理范围')
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === 'ArrowDown') {
                      event.preventDefault()
                      moveFocus(brand.name, current.id, 1)
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      moveFocus(brand.name, current.id, -1)
                    }
                  }}
                />
              )
              return isFirst ? <span ref={spotRef}>{input}</span> : input
            }),
            cellOf('差价', SHEET_COLUMN_WIDTH.diff, (_, row) => {
              if (row.isGroup || !row.row) return null
              const price = netPrice(
                data,
                sheet.refDate,
                sheet.refPeriod,
                brand.name,
                row.row,
                sheet.lengthPremium,
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
      title: '',
      width: SHEET_COLUMN_WIDTH.action,
      align: 'center',
      onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.isGroup || !row.rowId ? null : (
          <Popconfirm
            title="删除该行？"
            okText="删除"
            cancelText="取消"
            disabled={locked}
            onConfirm={() => removeRow(row.rowId ?? '')}
          >
            <Button
              size="small"
              type="text"
              disabled={locked}
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        ),
    },
  ]
}

/* ---------------------------------------------------------------- 子组件 */

function SheetHeader({
  sheet,
  data,
  projects,
  locked,
  capturing,
  patchSheet,
  capture,
  captureBtnRef,
}: {
  sheet: PriceSheet
  data: PriceData | null
  projects: ProjectOption[]
  locked: boolean
  capturing: boolean
  captureBtnRef: React.RefObject<HTMLSpanElement | null>
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  capture: (copy: boolean) => Promise<void>
}) {
  const periodLabel = (sheet.refPeriod || '').split(' ').pop()
  return (
    <Flex justify="space-between" align="center" wrap="wrap" gap="small">
      <Flex gap="middle" align="center" wrap="wrap">
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            单据名称
          </Text>
          <Input
            size="small"
            style={{ width: 120 }}
            disabled={locked}
            value={sheet.name}
            onChange={(event) =>
              patchSheet(sheet.id, { name: event.target.value })
            }
          />
        </Space>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            项目
          </Text>
          <Select
            size="small"
            style={{ width: 190 }}
            showSearch={{ optionFilterProp: 'label' }}
            disabled={locked}
            placeholder="选择系统项目"
            value={sheet.projectId || undefined}
            options={projects.map((project) => ({
              value: project.id,
              label: `${project.abbr} · ${project.name}`,
            }))}
            onChange={(value) => patchSheet(sheet.id, { projectId: value })}
          />
        </Space>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            报单日期
          </Text>
          <DatePicker
            size="small"
            disabled={locked}
            value={dayjs(sheet.orderDate)}
            format={DATE_FMT}
            allowClear={false}
            onChange={(value) =>
              value &&
              patchSheet(sheet.id, { orderDate: value.format('YYYY-MM-DD') })
            }
          />
        </Space>
        <Tooltip title="整组统一使用该日期与时段作为网价基准">
          <Tag color="green" icon={<InfoCircleOutlined />}>
            整组参照 {dayjs(sheet.refDate).format(DATE_FMT)} {periodLabel}
          </Tag>
        </Tooltip>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            参照网价
          </Text>
          <DatePicker
            size="small"
            disabled={locked}
            value={dayjs(sheet.refDate)}
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
            style={{ width: 112 }}
            disabled={locked}
            value={sheet.refPeriod}
            onChange={(value) => patchSheet(sheet.id, { refPeriod: value })}
            options={Object.keys(data?.[sheet.refDate] ?? {}).map((period) => ({
              value: period,
              label: period,
            }))}
          />
        </Space>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            12米加价
          </Text>
          <InputNumber
            size="small"
            disabled={locked}
            min={0}
            style={{ width: 64 }}
            value={sheet.lengthPremium}
            onChange={(value) =>
              patchSheet(sheet.id, { lengthPremium: value ?? 0 })
            }
          />
        </Space>
      </Flex>
      <Space>
        <Button
          size="small"
          icon={locked ? <UnlockOutlined /> : <LockOutlined />}
          onClick={() => patchSheet(sheet.id, { locked: !locked })}
        >
          {locked ? '解锁' : '锁定'}
        </Button>
        <Tooltip title="生成图片并下载">
          <span ref={captureBtnRef}>
            <Button
              size="small"
              icon={<CameraOutlined />}
              loading={capturing}
              onClick={() => {
                void capture(false)
              }}
            >
              截图
            </Button>
          </span>
        </Tooltip>
        <Button
          size="small"
          type="primary"
          icon={<CopyOutlined />}
          loading={capturing}
          onClick={() => {
            void capture(true)
          }}
        >
          复制图片
        </Button>
      </Space>
    </Flex>
  )
}

function SheetToolbar({
  brands,
  catalog,
  locked,
  setBrands,
  onOpenSettings,
  brandSelectRef,
}: {
  brands: Brand[]
  catalog: BrandOption[]
  locked: boolean
  brandSelectRef: React.RefObject<HTMLSpanElement | null>
  setBrands: (value: Brand[] | ((current: Brand[]) => Brand[])) => void
  onOpenSettings: () => void
}) {
  return (
    <Flex gap="middle" align="center" wrap="wrap" style={{ marginTop: 6 }}>
      <span ref={brandSelectRef}>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            品牌
          </Text>
          <Select
            size="small"
            mode="multiple"
            disabled={locked}
            style={{ minWidth: 220 }}
            placeholder="选择品牌（自动取数据源网价）"
            value={brands.map((brand) => brand.name)}
            options={catalog.map((item) => ({
              value: item.name,
              label: item.name,
            }))}
            onChange={(names) =>
              setBrands(() =>
                names.map(
                  (name) =>
                    brands.find((brand) => brand.name === name) ?? {
                      name,
                      freight:
                        catalog.find((item) => item.name === name)?.freight ??
                        0,
                    },
                ),
              )
            }
            maxTagCount="responsive"
          />
        </Space>
      </span>
      <Button size="small" icon={<SettingOutlined />} onClick={onOpenSettings}>
        品牌与运费
      </Button>
      <span className="price-compare-legend">
        差价：<i className="is-pos">+ 现货划算</i>
        <i className="is-neg">− 网价更优</i>（网价 − 现货 − 运费）
      </span>
    </Flex>
  )
}

function SheetStats({
  summary,
}: {
  summary: ReturnType<typeof computeSummary>
}) {
  return (
    <Flex gap="middle" align="center" wrap="wrap">
      <Statistic
        title="总吨数"
        value={summary.totalTon}
        styles={{ content: { fontSize: 16 } }}
      />
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
  projects: ProjectOption[]
  catalog: BrandOption[]
  brands: Brand[]
  rows: PriceRow[]
  density: 'small' | 'middle' | 'large'
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  setBrands: (value: Brand[] | ((current: Brand[]) => Brand[])) => void
  onOpenSettings: () => void
  brandSelectRef: React.RefObject<HTMLSpanElement | null>
  spotRef: React.RefObject<HTMLSpanElement | null>
  captureBtnRef: React.RefObject<HTMLSpanElement | null>
}

/** 单个报单: 商品行 × 品牌列组(网价/现货/差价) 的比价表。 */
export function SheetPanel(props: Props) {
  const {
    sheet,
    data,
    varieties,
    projects,
    catalog,
    brands,
    rows,
    density,
    patchSheet,
    setRows,
    setBrands,
    onOpenSettings,
    brandSelectRef,
    spotRef,
    captureBtnRef,
  } = props
  const captureRef = useRef<HTMLDivElement>(null)
  const [capturing, setCapturing] = useState(false)
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [bestGroups, setBestGroups] = useState<string[]>([])
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
  const removeRow = (rowId: string) =>
    setRows((list) => list.filter((row) => row.id !== rowId))

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

  const onReorderBrands = (from: number, to: number) =>
    setBrands((current) => moveItem(current, from, to))
  const onToggleBest = (category: string) =>
    setBestGroups((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    )

  const capture = async (copy: boolean) => {
    if (!captureRef.current) return
    setCapturing(true)
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
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
    data,
    varieties,
    brands,
    rows,
    locked,
    getSpot,
    getTon,
    setInput,
    patchRow,
    removeRow,
    moveFocus,
    onReorderBrands,
    bestGroups,
    onToggleBest,
    spotRef,
  })
  const dataSource = useMemo(() => buildGridRows(rows), [rows])
  const groupKeys = dataSource.map((row) => row.key)
  const collapsedSet = useMemo(() => new Set(collapsed), [collapsed])
  const summary = computeSummary(data, sheet, rows, brands)

  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      <div ref={captureRef}>
        <SheetHeader
          sheet={sheet}
          data={data}
          projects={projects}
          locked={locked}
          capturing={capturing}
          patchSheet={patchSheet}
          capture={capture}
          captureBtnRef={captureBtnRef}
        />
        <SheetToolbar
          brands={brands}
          catalog={catalog}
          locked={locked}
          setBrands={setBrands}
          onOpenSettings={onOpenSettings}
          brandSelectRef={brandSelectRef}
        />
        <Divider style={{ margin: '8px 0' }} />
        <SheetStats summary={summary} />
        <Table<GridRow>
          size={density}
          bordered
          sticky
          tableLayout="fixed"
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{
            x:
              SHEET_COLUMN_WIDTH.spec +
              SHEET_COLUMN_WIDTH.ton +
              SHEET_COLUMN_WIDTH.action +
              brands.length *
                (SHEET_COLUMN_WIDTH.net +
                  SHEET_COLUMN_WIDTH.spot +
                  SHEET_COLUMN_WIDTH.diff),
            y: 'calc(100vh - 400px)',
          }}
          rowClassName={(row) => (row.isGroup ? 'price-compare-group-row' : '')}
          expandable={{
            expandedRowKeys: groupKeys.filter((key) => !collapsedSet.has(key)),
            onExpandedRowsChange: (keys) => {
              const expanded = new Set(keys.map(String))
              setCollapsed(groupKeys.filter((key) => !expanded.has(key)))
            },
          }}
          style={{ marginTop: 8 }}
        />
        <SummaryBar summary={summary} />
      </div>
    </Card>
  )
}
