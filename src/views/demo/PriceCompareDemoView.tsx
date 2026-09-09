import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import {
  BRAND_OPTIONS,
  BREED_OPTIONS,
  DEMO_PERIOD,
  DEMO_QUOTE_DATE,
  LENGTH_OPTIONS,
  PERIOD_OPTIONS,
  PRICE_COMPARE_ROWS,
  SPEC_OPTIONS,
} from './price-compare-demo-data'

type SpotInput = { spot?: number; freight?: number }

const GREEN = '#389e0d'
const RED = '#cf1322'

/** 比价 demo：网价 vs 现货价（用户输入）− 运费 → 差价成表。 */
export function PriceCompareDemoView() {
  const [quoteDate, setQuoteDate] = useState<Dayjs | null>(null)
  const [period, setPeriod] = useState<string>(DEMO_PERIOD)
  const [breed, setBreed] = useState<string>('全部')
  const [brand, setBrand] = useState<string | undefined>()
  const [spec, setSpec] = useState<number | undefined>()
  const [length, setLength] = useState<string>('全部')
  const [inputs, setInputs] = useState<Record<string, SpotInput>>({})
  const [batchSpot, setBatchSpot] = useState<number | undefined>()
  const [batchFreight, setBatchFreight] = useState<number | undefined>()

  const filteredRows = useMemo(() => {
    return PRICE_COMPARE_ROWS.filter((row) => {
      if (breed !== '全部' && row.breed !== breed) return false
      if (brand && row.brand !== brand) return false
      if (spec !== undefined && row.spec !== spec) return false
      if (length !== '全部' && row.length !== length) return false
      return true
    })
  }, [breed, brand, spec, length])

  const computedRows = useMemo(() => {
    return filteredRows.map((row) => {
      const input = inputs[row.id] ?? {}
      const spot = input.spot
      const freight = input.freight
      const spotCost = spot !== undefined ? spot - (freight ?? 0) : undefined
      const diff = spotCost !== undefined ? row.netPrice - spotCost : undefined
      const diffRate =
        diff !== undefined ? (diff / row.netPrice) * 100 : undefined
      return { ...row, spot, freight, spotCost, diff, diffRate }
    })
  }, [filteredRows, inputs])

  const comparedRows = computedRows.filter((row) => row.diff !== undefined)
  const betterRows = comparedRows.filter((row) => (row.diff ?? 0) > 0)
  const bestDiff = comparedRows.length
    ? Math.max(...comparedRows.map((row) => row.diff ?? 0))
    : undefined
  const avgDiff = comparedRows.length
    ? comparedRows.reduce((sum, row) => sum + (row.diff ?? 0), 0) /
      comparedRows.length
    : undefined

  const applyBatch = () => {
    const next: Record<string, SpotInput> = {}
    for (const row of filteredRows) {
      next[row.id] = { spot: batchSpot, freight: batchFreight }
    }
    setInputs((previous) => ({ ...previous, ...next }))
  }

  const clearInputs = () => setInputs({})

  const columns: ColumnsType<(typeof computedRows)[number]> = [
    {
      title: '品牌',
      dataIndex: 'brand',
      width: 100,
      fixed: 'left',
      render: (value: string, row) => (
        <Space size={4}>
          <Typography.Text strong>{value}</Typography.Text>
          {row.factory !== value && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.factory}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '品类 / 材质',
      dataIndex: 'breed',
      width: 130,
      render: (value: string, row) => `${value} ${row.material}`,
    },
    {
      title: '规格',
      dataIndex: 'spec',
      width: 130,
      render: (value: number, row) => (
        <Space size={4}>
          <Typography.Text>{`Φ${value}`}</Typography.Text>
          <Tag style={{ marginInlineEnd: 0 }}>{row.matchedSpec}</Tag>
          {row.singleSpecPrice && (
            <Tag color="orange" style={{ marginInlineEnd: 0 }}>
              单规格价
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '长度',
      dataIndex: 'length',
      width: 70,
      render: (value: string) => (value === '-' ? '盘' : value),
    },
    {
      title: '网价 (元/吨)',
      dataIndex: 'netPrice',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.netPrice - b.netPrice,
      render: (value: number) => (
        <Typography.Text strong>{value.toFixed(0)}</Typography.Text>
      ),
    },
    {
      title: '现货价 (元/吨)',
      dataIndex: 'spot',
      width: 130,
      render: (value: number | undefined, row) => (
        <InputNumber
          value={value}
          min={0}
          max={99999}
          precision={0}
          placeholder="输入现货价"
          style={{ width: '100%' }}
          onChange={(next) =>
            setInputs((previous) => ({
              ...previous,
              [row.id]: { ...previous[row.id], spot: next ?? undefined },
            }))
          }
        />
      ),
    },
    {
      title: '运费 (元/吨)',
      dataIndex: 'freight',
      width: 120,
      render: (value: number | undefined, row) => (
        <InputNumber
          value={value}
          min={0}
          max={9999}
          precision={0}
          placeholder="0"
          style={{ width: '100%' }}
          onChange={(next) =>
            setInputs((previous) => ({
              ...previous,
              [row.id]: { ...previous[row.id], freight: next ?? undefined },
            }))
          }
        />
      ),
    },
    {
      title: '现货成本',
      dataIndex: 'spotCost',
      width: 90,
      align: 'right',
      render: (value: number | undefined) =>
        value === undefined ? '—' : value.toFixed(0),
    },
    {
      title: '差价 (元/吨)',
      dataIndex: 'diff',
      width: 110,
      align: 'right',
      defaultSortOrder: 'descend',
      sorter: (a, b) =>
        (a.diff ?? Number.NEGATIVE_INFINITY) -
        (b.diff ?? Number.NEGATIVE_INFINITY),
      render: (value: number | undefined) => {
        if (value === undefined) return '—'
        return (
          <Typography.Text
            strong
            style={{ color: value > 0 ? GREEN : value < 0 ? RED : undefined }}
          >
            {value > 0 ? `+${value.toFixed(0)}` : value.toFixed(0)}
          </Typography.Text>
        )
      },
    },
    {
      title: '差率',
      dataIndex: 'diffRate',
      width: 90,
      align: 'right',
      sorter: (a, b) => (a.diffRate ?? 0) - (b.diffRate ?? 0),
      render: (value: number | undefined) => {
        if (value === undefined) return '—'
        return (
          <Tag
            color={value > 0 ? 'green' : value < 0 ? 'red' : 'default'}
            style={{ marginInlineEnd: 0 }}
          >
            {value > 0 ? '+' : ''}
            {value.toFixed(2)}%
          </Tag>
        )
      },
    },
    {
      title: '结论',
      dataIndex: 'diff',
      width: 110,
      render: (value: number | undefined) => {
        if (value === undefined) return <Tag>未比价</Tag>
        if (value > 0) return <Tag color="green">现货更划算</Tag>
        if (value < 0) return <Tag color="red">网价更优</Tag>
        return <Tag color="blue">持平</Tag>
      },
    },
  ]

  return (
    <Flex gap="middle" vertical>
      <Alert
        type="info"
        showIcon
        title={`比价 demo — 行情 ${DEMO_QUOTE_DATE} ${DEMO_PERIOD}（mock 数据）`}
        description="差价 = 网价 − (现货价 − 运费)；正值表示现货采购比按网价采购更划算。后续接入 GET /api/v2.0/material-price-matches 提供真实行情。"
      />

      <Card size="small">
        <Flex gap="middle" wrap="wrap" align="center">
          <Space size="small">
            <Typography.Text type="secondary">行情日期</Typography.Text>
            <DatePicker
              value={quoteDate}
              placeholder={DEMO_QUOTE_DATE}
              onChange={(value) => setQuoteDate(value)}
              allowClear
            />
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">时段</Typography.Text>
            <Segmented
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(value) => setPeriod(value)}
            />
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">品类</Typography.Text>
            <Segmented
              options={BREED_OPTIONS}
              value={breed}
              onChange={(value) => setBreed(value)}
            />
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">长度</Typography.Text>
            <Segmented
              options={LENGTH_OPTIONS}
              value={length}
              onChange={(value) => setLength(value)}
            />
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">品牌</Typography.Text>
            <Select
              allowClear
              placeholder="全部品牌"
              style={{ width: 140 }}
              options={BRAND_OPTIONS.map((value) => ({ label: value, value }))}
              value={brand}
              onChange={(value) => setBrand(value)}
            />
          </Space>
          <Space size="small">
            <Typography.Text type="secondary">规格</Typography.Text>
            <Select
              allowClear
              placeholder="全部规格"
              style={{ width: 110 }}
              options={SPEC_OPTIONS.map((value) => ({
                label: `Φ${value}`,
                value,
              }))}
              value={spec}
              onChange={(value) => setSpec(value)}
            />
          </Space>
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="已比价条数"
              value={comparedRows.length}
              suffix={`/ ${filteredRows.length}`}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="现货更划算"
              value={betterRows.length}
              styles={{ content: { color: GREEN } }}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="最优差价"
              value={bestDiff === undefined ? '—' : bestDiff}
              precision={0}
              prefix={bestDiff !== undefined && bestDiff > 0 ? '+' : undefined}
              suffix="元/吨"
              styles={{
                content: {
                  color: bestDiff !== undefined && bestDiff > 0 ? GREEN : RED,
                },
              }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="平均差价"
              value={avgDiff === undefined ? '—' : avgDiff}
              precision={1}
              suffix="元/吨"
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={`比价明细（${filteredRows.length} 条）`}
        extra={
          <Space size="middle" wrap>
            <InputNumber
              value={batchSpot}
              min={0}
              max={99999}
              precision={0}
              placeholder="批量现货价"
              suffix="元/吨"
              style={{ width: 170 }}
              onChange={(value) => setBatchSpot(value ?? undefined)}
            />
            <InputNumber
              value={batchFreight}
              min={0}
              max={9999}
              precision={0}
              placeholder="批量运费"
              suffix="元/吨"
              style={{ width: 160 }}
              onChange={(value) => setBatchFreight(value ?? undefined)}
            />
            <Button
              type="primary"
              onClick={applyBatch}
              disabled={filteredRows.length === 0}
            >
              批量填充
            </Button>
            <Button
              onClick={clearInputs}
              disabled={Object.keys(inputs).length === 0}
            >
              清空输入
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={computedRows}
          pagination={false}
          scroll={{ x: 1080 }}
        />
      </Card>
    </Flex>
  )
}
