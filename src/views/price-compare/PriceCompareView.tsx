import {
  Button,
  Card,
  ConfigProvider,
  DatePicker,
  Flex,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import priceCompareData from './price-compare-data.json'
import './price-compare.css'

const { Text } = Typography
const DATE_FMT = 'YYYY年M月D日'
const LS_KEY = 'price-compare-page-v1'

/** 行情数据: 日期 -> 时段 -> 品牌 -> 规格 -> 网价 */
type PriceData = Record<
  string,
  Record<string, Record<string, Record<string, number>>>
>
type Brand = { id: string; name: string; freight: number; groups: string[] }
type GridRowConfig = { id: string; label: string }
type GroupConfig = { id: string; name: string; rows: GridRowConfig[] }
type Config = { brands: Brand[]; groups: GroupConfig[] }
type BlockInput = { ton?: number; net?: number; spot?: number }
type BlockInputs = Record<string, BlockInput>
type Block = {
  id: string
  project: string
  orderDate: string
  refDate: string
  refPeriod: string
  inputs: BlockInputs
}
type GridRow = {
  key: string
  isGroup: boolean
  gi: number
  name?: string
  ri?: number
  rowId?: string
  label?: string
  rowKey?: string
  groupName: string
  children?: GridRow[]
}

const DATA = priceCompareData as PriceData
const dates = Object.keys(DATA).sort().reverse()
const periodsOf = (date: string) => Object.keys(DATA[date] ?? {})
const firstPeriod = (date: string) => periodsOf(date)[0] ?? ''
const uid = () => Math.random().toString(36).slice(2, 8)

const defaultConfig = (): Config => ({
  brands: [
    { id: uid(), name: '镜鑫', freight: 30, groups: ['螺纹钢', '盘螺'] },
    { id: uid(), name: '中天', freight: 30, groups: ['螺纹钢', '盘螺'] },
    { id: uid(), name: '万泰', freight: 10, groups: ['螺纹钢'] },
    { id: uid(), name: '中杭', freight: 15, groups: ['螺纹钢'] },
    { id: uid(), name: '亚新', freight: 30, groups: ['盘螺'] },
  ],
  groups: [
    {
      id: uid(),
      name: '螺纹钢',
      rows: ['12E', '14E', '16E', '18E', '20E', '22E', '25E'].map((label) => ({
        id: uid(),
        label,
      })),
    },
    {
      id: uid(),
      name: '盘螺',
      rows: ['盘螺6', '盘螺8', '盘螺10'].map((label) => ({ id: uid(), label })),
    },
  ],
})

const newBlock = (
  project: string,
  orderDate: string,
  refDate: string,
  refPeriod: string,
): Block => ({
  id: uid(),
  project,
  orderDate,
  refDate,
  refPeriod,
  inputs: {},
})

const defaultState = (): { config: Config; blocks: Block[] } => ({
  config: defaultConfig(),
  blocks: [
    newBlock('云澜筝鸣府', '2026-09-06', '2026-09-07', '12:00 中午'),
    newBlock('云澜筝鸣府', '2026-09-09', '2026-09-10', '9:30 上午'),
  ],
})

function loadState(): { config: Config; blocks: Block[] } {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as { config: Config; blocks: Block[] }
    return parsed.config && parsed.blocks ? parsed : defaultState()
  } catch {
    return defaultState()
  }
}

/** 报单比价页: 多报单块堆叠, 品牌列组(网价/现货/差价), 分组用 antd 树形分组。 */
export function PriceCompareView() {
  const initial = useMemo(() => loadState(), [])
  const [config, setConfig] = useState<Config>(initial.config)
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks)

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ config, blocks }))
  }, [config, blocks])

  const patchConfig = (updater: (draft: Config) => void) =>
    setConfig((prev) => {
      const draft = structuredClone(prev)
      updater(draft)
      return draft
    })

  return (
    <ConfigProvider locale={zhCN}>
      <Flex vertical gap="middle">
        <Card size="small" styles={{ body: { padding: 10 } }}>
          <Button
            type="primary"
            onClick={() =>
              setBlocks((prev) => [
                ...prev,
                newBlock(
                  prev[0]?.project ?? '项目',
                  dayjs().format('YYYY-MM-DD'),
                  dates[0],
                  firstPeriod(dates[0]),
                ),
              ])
            }
          >
            ＋ 报单块
          </Button>
        </Card>
        {blocks.map((block) => (
          <BlockTable
            key={block.id}
            block={block}
            config={config}
            setBlocks={setBlocks}
            patchConfig={patchConfig}
            resetConfig={() => setConfig(defaultConfig())}
          />
        ))}
      </Flex>
    </ConfigProvider>
  )
}

type BlockTableProps = {
  block: Block
  config: Config
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
  patchConfig: (updater: (draft: Config) => void) => void
  resetConfig: () => void
}

function BlockTable({
  block,
  config,
  setBlocks,
  patchConfig,
  resetConfig,
}: BlockTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() =>
    config.groups.map((_, i) => `g${i}`),
  )
  const groupKeys = useMemo(
    () => config.groups.map((_, i) => `g${i}`),
    [config.groups],
  )

  useEffect(() => {
    setExpandedKeys((prev) => Array.from(new Set([...prev, ...groupKeys])))
  }, [groupKeys])

  const refPrice = (brandName: string, label: string) =>
    DATA[block.refDate]?.[block.refPeriod]?.[brandName]?.[label]
  const periodLabel = block.refPeriod.split(' ').pop()
  const totalCols = 2 + config.brands.length * 3
  const applies = (brand: Brand, groupName: string) =>
    !brand.groups || brand.groups.includes(groupName)

  const getVal = (brandId: string, rowId: string, kind: keyof BlockInput) =>
    block.inputs[`${brandId}:${rowId}`]?.[kind]
  const getTon = (rowId: string) => block.inputs[`_:${rowId}`]?.ton
  const setBlock = (patch: Partial<Block>) =>
    setBlocks((prev) =>
      prev.map((item) => (item.id === block.id ? { ...item, ...patch } : item)),
    )
  const setVal = (
    key: string,
    kind: keyof BlockInput,
    value: number | undefined,
  ) =>
    setBlock({
      inputs: {
        ...block.inputs,
        [key]: { ...(block.inputs[key] ?? {}), [kind]: value },
      },
    })

  const cell = (
    title: string,
    width: number,
    render: (value: unknown, row: GridRow) => React.ReactNode,
  ): ColumnsType<GridRow>[number] => ({
    title,
    width,
    align: 'center',
    render,
    onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
  })

  const columns: ColumnsType<GridRow> = [
    {
      title: '规格',
      dataIndex: 'label',
      fixed: 'left',
      width: 190,
      onCell: (row) => (row.isGroup ? { colSpan: totalCols } : {}),
      render: (_, row) => {
        if (row.isGroup) {
          return (
            <Flex gap="small" align="center" wrap="nowrap">
              <Text strong>{row.name}</Text>
              <Button
                size="small"
                onClick={() => {
                  const value = window.prompt('分组名称', row.name ?? '')
                  if (value) {
                    patchConfig((draft) => {
                      draft.groups[row.gi].name = value
                    })
                  }
                }}
              >
                改名
              </Button>
              <Button
                size="small"
                onClick={() =>
                  patchConfig((draft) => {
                    draft.groups[row.gi].rows.push({
                      id: uid(),
                      label: '新规格',
                    })
                  })
                }
              >
                ＋行
              </Button>
              <Button
                size="small"
                danger
                onClick={() =>
                  patchConfig((draft) => {
                    draft.groups.splice(row.gi, 1)
                  })
                }
              >
                刪除分组
              </Button>
            </Flex>
          )
        }
        return (
          <Space size="small">
            <Input
              size="small"
              style={{ width: 70 }}
              value={row.label}
              onChange={(event) =>
                patchConfig((draft) => {
                  draft.groups[row.gi].rows[row.ri ?? 0].label =
                    event.target.value
                })
              }
            />
            <Button
              size="small"
              onClick={() =>
                patchConfig((draft) => {
                  draft.groups[row.gi].rows.splice(row.ri ?? 0, 1)
                })
              }
            >
              ×
            </Button>
          </Space>
        )
      },
    },
    {
      title: '吨',
      width: 70,
      align: 'center',
      onCell: (row) => (row.isGroup ? { colSpan: 0 } : {}),
      render: (_, row) =>
        row.isGroup ? null : (
          <InputNumber
            size="small"
            min={0}
            style={{ width: 64 }}
            value={getTon(row.rowId ?? '')}
            onChange={(value) =>
              setVal(`_:${row.rowId}`, 'ton', value ?? undefined)
            }
          />
        ),
    },
    ...config.brands.flatMap(
      (brand): ColumnsType<GridRow> => [
        {
          title: (
            <div className="price-compare-brand-header">
              <Input
                size="small"
                value={brand.name}
                onChange={(event) =>
                  patchConfig((draft) => {
                    const target = draft.brands.find(
                      (item) => item.id === brand.id,
                    )
                    if (target) target.name = event.target.value
                  })
                }
              />
              <span className="price-compare-brand-sub">
                运费{' '}
                <InputNumber
                  size="small"
                  min={0}
                  value={brand.freight}
                  onChange={(value) =>
                    patchConfig((draft) => {
                      const target = draft.brands.find(
                        (item) => item.id === brand.id,
                      )
                      if (target) target.freight = value ?? 0
                    })
                  }
                />
              </span>
              <span className="price-compare-brand-sub">
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto', fontSize: 11 }}
                  onClick={() =>
                    patchConfig((draft) => {
                      draft.brands = draft.brands.filter(
                        (item) => item.id !== brand.id,
                      )
                    })
                  }
                >
                  删除
                </Button>
              </span>
            </div>
          ),
          children: [
            cell('网价', 80, (_, row) => {
              if (row.isGroup || !applies(brand, row.groupName)) return null
              const auto = refPrice(brand.name, row.label ?? '')
              if (auto !== undefined) return <Text strong>{auto}</Text>
              return (
                <InputNumber
                  size="small"
                  style={{ width: 74 }}
                  placeholder="手填"
                  value={getVal(brand.id, row.rowId ?? '', 'net')}
                  onChange={(value) =>
                    setVal(
                      `${brand.id}:${row.rowId}`,
                      'net',
                      value ?? undefined,
                    )
                  }
                />
              )
            }),
            cell('现货', 80, (_, row) => {
              if (row.isGroup || !applies(brand, row.groupName)) return null
              return (
                <InputNumber
                  size="small"
                  style={{ width: 74 }}
                  value={getVal(brand.id, row.rowId ?? '', 'spot')}
                  onChange={(value) =>
                    setVal(
                      `${brand.id}:${row.rowId}`,
                      'spot',
                      value ?? undefined,
                    )
                  }
                />
              )
            }),
            cell('差价', 64, (_, row) => {
              if (row.isGroup || !applies(brand, row.groupName)) return null
              const auto = refPrice(brand.name, row.label ?? '')
              const net =
                auto !== undefined
                  ? auto
                  : getVal(brand.id, row.rowId ?? '', 'net')
              const spot = getVal(brand.id, row.rowId ?? '', 'spot')
              if (
                net === undefined ||
                net === null ||
                spot === undefined ||
                spot === null
              )
                return null
              const diff = net - spot - brand.freight
              return (
                <Text
                  strong
                  className={
                    diff > 0
                      ? 'price-compare-pos'
                      : diff < 0
                        ? 'price-compare-neg'
                        : ''
                  }
                >
                  {diff > 0 ? '+' : ''}
                  {diff}
                </Text>
              )
            }),
          ],
        },
      ],
    ),
  ]

  const dataSource: GridRow[] = config.groups.map((group, gi) => ({
    key: `g${gi}`,
    isGroup: true,
    gi,
    name: group.name,
    groupName: group.name,
    children: group.rows.map((row, ri) => ({
      key: `${group.id}:${row.id}`,
      isGroup: false,
      gi,
      ri,
      rowId: row.id,
      label: row.label,
      groupName: group.name,
    })),
  }))

  const summary = () => {
    let totalTon = 0
    const amount: Record<string, number> = {}
    for (const group of config.groups) {
      for (const row of group.rows) {
        const ton = getTon(row.id)
        if (!ton) continue
        totalTon += ton
        for (const brand of config.brands) {
          if (!applies(brand, group.name)) continue
          const auto = refPrice(brand.name, row.label)
          const net =
            auto !== undefined ? auto : getVal(brand.id, row.id, 'net')
          const spot = getVal(brand.id, row.id, 'spot')
          if (
            net === undefined ||
            net === null ||
            spot === undefined ||
            spot === null
          )
            continue
          amount[brand.id] =
            (amount[brand.id] ?? 0) + (net - spot - brand.freight) * ton
        }
      }
    }
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell index={0}>
          <Text strong>合计{totalTon ? ` (${totalTon} 吨)` : ''}</Text>
        </Table.Summary.Cell>
        <Table.Summary.Cell index={1} />
        {config.brands.flatMap((brand) => [
          <Table.Summary.Cell
            key={brand.id}
            index={0}
            align="center"
            colSpan={3}
          >
            {amount[brand.id] !== undefined && (
              <Text className="price-compare-brand-sub">
                盈亏 {(amount[brand.id] ?? 0) > 0 ? '+' : ''}
                {Math.round(amount[brand.id] ?? 0)} 元
              </Text>
            )}
          </Table.Summary.Cell>,
        ])}
      </Table.Summary.Row>
    )
  }

  return (
    <Card
      size="small"
      title={
        <Flex gap="small" align="center" wrap="wrap">
          <Tag color="gold">{dayjs(block.orderDate).format(DATE_FMT)}报单</Tag>
          <Space size="small">
            <Text type="secondary" className="price-compare-brand-sub">
              报单日期
            </Text>
            <DatePicker
              size="small"
              value={dayjs(block.orderDate)}
              format={DATE_FMT}
              allowClear={false}
              onChange={(value) =>
                value && setBlock({ orderDate: value.format('YYYY-MM-DD') })
              }
            />
          </Space>
          <Space size="small">
            <Text type="secondary" className="price-compare-brand-sub">
              项目
            </Text>
            <Input
              size="small"
              style={{ width: 130 }}
              value={block.project}
              onChange={(event) => setBlock({ project: event.target.value })}
            />
          </Space>
          <Space size="small">
            <Text type="secondary" className="price-compare-brand-sub">
              参照网价
            </Text>
            <DatePicker
              size="small"
              value={dayjs(block.refDate)}
              format={DATE_FMT}
              allowClear={false}
              onChange={(value) => {
                if (!value) return
                const date = value.format('YYYY-MM-DD')
                setBlock({ refDate: date, refPeriod: firstPeriod(date) })
              }}
            />
            <Select
              size="small"
              style={{ width: 124 }}
              value={block.refPeriod}
              onChange={(value) => setBlock({ refPeriod: value })}
              options={periodsOf(block.refDate).map((period) => ({
                value: period,
                label: period,
              }))}
            />
          </Space>
          <Tag color="green">
            参照 {dayjs(block.refDate).format(DATE_FMT)} {periodLabel}
          </Tag>
        </Flex>
      }
      extra={
        <Space wrap>
          <Button
            size="small"
            onClick={() =>
              patchConfig((draft) => {
                draft.brands.push({
                  id: uid(),
                  name: '新品牌',
                  freight: 0,
                  groups: config.groups.map((group) => group.name),
                })
              })
            }
          >
            ＋品牌列
          </Button>
          <Button
            size="small"
            onClick={() =>
              patchConfig((draft) => {
                draft.groups.push({
                  id: uid(),
                  name: '新分组',
                  rows: [{ id: uid(), label: '新规格' }],
                })
              })
            }
          >
            ＋分组
          </Button>
          <Button size="small" onClick={resetConfig}>
            重置品牌/分组
          </Button>
          <Button
            size="small"
            danger
            onClick={() =>
              setBlocks((prev) => prev.filter((item) => item.id !== block.id))
            }
          >
            删除本块
          </Button>
        </Space>
      }
    >
      <Table<GridRow>
        size="small"
        bordered
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: 'max-content' }}
        summary={summary}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: (keys) => setExpandedKeys(keys.map(String)),
        }}
      />
    </Card>
  )
}
