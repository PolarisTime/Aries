import {
  AccountBookOutlined,
  AuditOutlined,
  ClearOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  PayCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  theme,
  Upload,
} from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { type Key, useEffect, useMemo, useState } from 'react'

interface WeighSlipItem {
  id: string
  slipNo: string
  productName: string
  spec: string
  netWeight: number
  unitPrice: number
  subtotal: number
  deductionNote?: string
}

interface StatementItem {
  id: string
  statementNo: string
  periodStart: string
  periodEnd: string
  dueDate: string
  totalAmount: number
  outstandingAmount: number
  signed: boolean
  details: WeighSlipItem[]
}

interface CustomerData {
  id: string
  name: string
  creditTerm: string
  totalOutstanding: number
  overdueAmount: number
  inTransitAmount: number
  statements: StatementItem[]
}

type ReceiptMode = 'reconcile' | 'prepaid' | 'deposit'

interface FormValues {
  amount?: number
  settlementEntity?: string
  bizType?: string
  customerId?: string
  receiptDate?: Dayjs
  receiptMethod?: string
  bankAccount?: string
  remark?: string
}

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_SECTION_UNITS = ['', '万', '亿', '兆']

function sectionToChinese(num: number): string {
  let str = ''
  let zero = false
  for (let i = 3; i >= 0; i--) {
    const digit = Math.floor(num / 10 ** i) % 10
    if (digit === 0) {
      zero = str !== ''
    } else {
      if (zero) str += '零'
      zero = false
      str += CN_DIGITS[digit] + CN_UNITS[i]
    }
  }
  return str
}

function integerToChinese(yuan: number): string {
  const groups: number[] = []
  let rest = yuan
  while (rest > 0) {
    groups.push(rest % 10000)
    rest = Math.floor(rest / 10000)
  }
  let str = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    if (str && groups[i] < 1000) str += '零'
    str += sectionToChinese(groups[i]) + CN_SECTION_UNITS[i]
  }
  return str
}

function digitToChineseUppercase(n: number): string {
  if (!Number.isFinite(n)) return ''
  if (n <= 0) return '零元整'
  const cents = Math.round(n * 100)
  const yuan = Math.floor(cents / 100)
  const jiao = Math.floor((cents % 100) / 10)
  const fen = cents % 10
  let result = ''
  if (yuan > 0) result += integerToChinese(yuan) + '元'
  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    if (jiao > 0) result += CN_DIGITS[jiao] + '角'
    else if (yuan > 0 && fen > 0) result += '零'
    if (fen > 0) result += CN_DIGITS[fen] + '分'
    else if (jiao === 0 && yuan === 0) result = ''
  }
  return result
}

const fmtMoney = (n?: number): string =>
  (n ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const MOCK_CUSTOMERS: CustomerData[] = [
  {
    id: 'C-0001',
    name: '浙江申源建设',
    creditTerm: '月结 30 天',
    totalOutstanding: 486350.5,
    overdueAmount: 128600,
    inTransitAmount: 76800,
    statements: [
      {
        id: 'SOA-2026-0701',
        statementNo: 'SOA-20260701-012',
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        dueDate: dayjs().subtract(9, 'day').format('YYYY-MM-DD'),
        totalAmount: 128600,
        outstandingAmount: 128600,
        signed: true,
        details: [
          {
            id: 'W-01',
            slipNo: 'BD-20260605-031',
            productName: '螺纹钢',
            spec: 'HRB400E Φ12mm',
            netWeight: 58.62,
            unitPrice: 3480,
            subtotal: 203997.6,
            deductionNote: '扣水锈 0.12t',
          },
          {
            id: 'W-02',
            slipNo: 'BD-20260612-047',
            productName: '螺纹钢',
            spec: 'HRB400E Φ16mm',
            netWeight: 76.35,
            unitPrice: 3465,
            subtotal: 264552.75,
          },
          {
            id: 'W-03',
            slipNo: 'BD-20260626-088',
            productName: '盘螺',
            spec: 'HRB400E Φ8mm',
            netWeight: 24.18,
            unitPrice: 3520,
            subtotal: 85113.6,
            deductionNote: '磅差扣减 35.95 元',
          },
        ],
      },
      {
        id: 'SOA-2026-0802',
        statementNo: 'SOA-20260802-021',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        dueDate: dayjs().add(21, 'day').format('YYYY-MM-DD'),
        totalAmount: 215750.5,
        outstandingAmount: 215750.5,
        signed: true,
        details: [
          {
            id: 'W-11',
            slipNo: 'BD-20260703-012',
            productName: '螺纹钢',
            spec: 'HRB400E Φ20mm',
            netWeight: 92.4,
            unitPrice: 3430,
            subtotal: 316932,
            deductionNote: '让利 2% 后 310593.36 元',
          },
          {
            id: 'W-12',
            slipNo: 'BD-20260718-056',
            productName: '高线',
            spec: 'HPB300 Φ6.5mm',
            netWeight: 45.6,
            unitPrice: 3610,
            subtotal: 164616,
          },
        ],
      },
      {
        id: 'SOA-2026-0901',
        statementNo: 'SOA-20260901-033',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        dueDate: dayjs().add(52, 'day').format('YYYY-MM-DD'),
        totalAmount: 142000,
        outstandingAmount: 142000,
        signed: false,
        details: [
          {
            id: 'W-21',
            slipNo: 'BD-20260809-023',
            productName: '螺纹钢',
            spec: 'HRB400E Φ25mm',
            netWeight: 41.37,
            unitPrice: 3432,
            subtotal: 141984.84,
            deductionNote: '扣司磅差异 0.05t',
          },
        ],
      },
    ],
  },
  {
    id: 'C-0002',
    name: '杭州城投建设',
    creditTerm: '月结 60 天',
    totalOutstanding: 362400,
    overdueAmount: 0,
    inTransitAmount: 125600,
    statements: [
      {
        id: 'SOA-C0201',
        statementNo: 'SOA-20260815-007',
        periodStart: '2026-07-01',
        periodEnd: '2026-07-31',
        dueDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        totalAmount: 210400,
        outstandingAmount: 132400,
        signed: true,
        details: [
          {
            id: 'W-31',
            slipNo: 'BD-20260706-009',
            productName: '螺纹钢',
            spec: 'HRB400E Φ14mm',
            netWeight: 68.9,
            unitPrice: 3440,
            subtotal: 237016,
          },
          {
            id: 'W-32',
            slipNo: 'BD-20260721-071',
            productName: '螺纹钢',
            spec: 'HRB400E Φ18mm',
            netWeight: 33.2,
            unitPrice: 3455,
            subtotal: 114706,
            deductionNote: '已收承兑汇票 78000 元冲抵',
          },
        ],
      },
      {
        id: 'SOA-C0202',
        statementNo: 'SOA-20260905-019',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        dueDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
        totalAmount: 230000,
        outstandingAmount: 230000,
        signed: false,
        details: [
          {
            id: 'W-41',
            slipNo: 'BD-20260811-044',
            productName: '盘螺',
            spec: 'HRB400E Φ6mm',
            netWeight: 31.75,
            unitPrice: 3540,
            subtotal: 112395,
          },
          {
            id: 'W-42',
            slipNo: 'BD-20260825-092',
            productName: '螺纹钢',
            spec: 'HRB400E Φ22mm',
            netWeight: 34.06,
            unitPrice: 3452,
            subtotal: 117581.12,
            deductionNote: '扣杂费 12 元',
          },
        ],
      },
    ],
  },
]

const SETTLEMENT_ENTITIES = ['颖捷建材', '杭州供应链管理']
const BIZ_TYPES = ['销售收款', '预收定金', '履约保证金', '往来冲抵']
const PAY_METHODS = ['银行转账', '银行承兑汇票', '现金', '线上支付']
const BANK_ACCOUNTS = [
  '工行杭州城东支行 **** 8891',
  '建行杭州滨江支行 **** 3356',
  '招行杭州分行营业部 **** 1024',
]

interface ReceiptReconcileModalProps {
  open: boolean
  onClose: () => void
}

function StatementStatusTag({ statement }: { statement: StatementItem }) {
  const overdueDays = dayjs().diff(dayjs(statement.dueDate), 'day')
  if (overdueDays > 0) {
    return (
      <Tag color="red" style={{ marginInlineEnd: 0 }}>
        逾期 {overdueDays} 天
      </Tag>
    )
  }
  return statement.signed ? (
    <Tag color="green" style={{ marginInlineEnd: 0 }}>
      双方已签章
    </Tag>
  ) : (
    <Tag color="gold" style={{ marginInlineEnd: 0 }}>
      待客户签章
    </Tag>
  )
}

function DashboardStat({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  const { token } = theme.useToken()
  return (
    <Flex justify="space-between" align="center">
      <span
        style={{ color: token.colorTextSecondary, fontSize: token.fontSize }}
      >
        {label}
      </span>
      <Typography.Text
        strong
        type={danger ? 'danger' : undefined}
        style={{
          fontSize: token.fontSizeLG,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography.Text>
    </Flex>
  )
}

export default function ReceiptReconcileModal({
  open,
  onClose,
}: ReceiptReconcileModalProps) {
  const { token } = theme.useToken()
  const [form] = Form.useForm<FormValues>()
  const [mode, setMode] = useState<ReceiptMode>('reconcile')
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [drawerStatement, setDrawerStatement] = useState<StatementItem | null>(
    null,
  )
  const [attachments, setAttachments] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const amount = Form.useWatch('amount', form) ?? 0
  const customerId = Form.useWatch('customerId', form)

  const customer = useMemo(
    () => MOCK_CUSTOMERS.find((c) => c.id === customerId) ?? MOCK_CUSTOMERS[0],
    [customerId],
  )
  const statements = customer.statements

  const [openedOnce, setOpenedOnce] = useState(false)
  if (open && !openedOnce) {
    setOpenedOnce(true)
    setMode('reconcile')
    setDrawerStatement(null)
    setAttachments([])
    setAllocations({})
    setSelectedKeys(MOCK_CUSTOMERS[0].statements.map((s) => s.id))
    form.setFieldsValue({
      receiptDate: dayjs(),
      settlementEntity: SETTLEMENT_ENTITIES[0],
      bizType: BIZ_TYPES[0],
      customerId: MOCK_CUSTOMERS[0].id,
      receiptMethod: PAY_METHODS[0],
      bankAccount: BANK_ACCOUNTS[0],
      amount: 50000,
    })
  }
  if (!open && openedOnce) {
    setOpenedOnce(false)
  }

  const [renderedCustomerId, setRenderedCustomerId] = useState<string | null>(
    null,
  )
  if (open && renderedCustomerId !== customer.id) {
    setRenderedCustomerId(customer.id)
    setAllocations({})
    setSelectedKeys(statements.map((s) => s.id))
  }

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const fifoAllocate = (total: number) => {
    const sorted = [...statements]
      .filter((s) => selectedKeySet.has(s.id))
      .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    let remaining = Math.max(0, total)
    const next: Record<string, number> = {}
    for (const s of sorted) {
      if (remaining <= 0) break
      const alloc = Math.min(s.outstandingAmount, remaining)
      next[s.id] = Number(alloc.toFixed(2))
      remaining = Number((remaining - alloc).toFixed(2))
    }
    setAllocations(next)
  }

  const totalAllocated = useMemo(
    () =>
      Number(
        Object.entries(allocations)
          .filter(([id]) => selectedKeySet.has(id))
          .reduce((sum, [, v]) => sum + (v ?? 0), 0)
          .toFixed(2),
      ),
    [allocations, selectedKeySet],
  )
  const toPrepaid = Math.max(
    0,
    Number(((amount ?? 0) - totalAllocated).toFixed(2)),
  )
  const remainingDebt = Math.max(
    0,
    Number((customer.totalOutstanding - totalAllocated).toFixed(2)),
  )

  const handleAmountChange = (value: number | null) => {
    if (mode === 'reconcile') fifoAllocate(value ?? 0)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        void form.submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, form])

  const handleSubmit = (draft: boolean) => {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      messageApi.success(
        draft
          ? `收款单草稿已保存：${fmtMoney(amount)} 元`
          : `确认收款 ${fmtMoney(amount)} 元，核销对账单 ${fmtMoney(totalAllocated)} 元${toPrepaid > 0 ? `，转预收 ${fmtMoney(toPrepaid)} 元` : ''}`,
      )
      onClose()
    }, 600)
  }

  const columns: TableColumnsType<StatementItem> = [
    {
      title: '对账单号',
      dataIndex: 'statementNo',
      width: 170,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          style={{ paddingInline: 0, fontFamily: token.fontFamilyCode }}
          onClick={() => setDrawerStatement(record)}
        >
          {record.statementNo}
        </Button>
      ),
    },
    {
      title: '对账周期',
      width: 130,
      render: (_, record) => (
        <Typography.Text style={{ fontSize: token.fontSizeSM }}>
          {record.periodStart.slice(5)} ~ {record.periodEnd.slice(5)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      width: 110,
      render: (_, record) => <StatementStatusTag statement={record} />,
    },
    {
      title: '对账总额',
      dataIndex: 'totalAmount',
      align: 'right',
      width: 110,
      render: (v: number) => fmtMoney(v),
    },
    {
      title: '未结清待付',
      dataIndex: 'outstandingAmount',
      align: 'right',
      width: 120,
      render: (v: number) => (
        <Typography.Text strong style={{ color: token.colorWarning }}>
          {fmtMoney(v)}
        </Typography.Text>
      ),
    },
    {
      title: '本次冲抵核销',
      dataIndex: 'allocation',
      align: 'right',
      width: 160,
      render: (_, record) => {
        const value = allocations[record.id]
        const overflow = (value ?? 0) > record.outstandingAmount
        return (
          <Flex vertical align="flex-end" gap={2}>
            <InputNumber
              size="small"
              min={0}
              max={record.outstandingAmount}
              precision={2}
              status={overflow ? 'error' : undefined}
              value={value}
              disabled={!selectedKeySet.has(record.id)}
              placeholder="0.00"
              style={{ width: 140, fontFamily: token.fontFamilyCode }}
              onChange={(v) =>
                setAllocations((prev) => ({ ...prev, [record.id]: v ?? 0 }))
              }
            />
            {overflow && (
              <Typography.Text
                type="danger"
                style={{ fontSize: token.fontSizeSM }}
              >
                超出未结余额 {fmtMoney((value ?? 0) - record.outstandingAmount)}
              </Typography.Text>
            )}
          </Flex>
        )
      },
    },
  ]

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={1180}
      title={
        <Flex align="center" gap={12}>
          <Tag color="default">草稿</Tag>
          <span className="font-semibold">收款核销工作台</span>
          <Typography.Text
            type="secondary"
            style={{
              fontFamily: token.fontFamilyCode,
              fontSize: token.fontSizeSM,
            }}
          >
            REC-20260909-088
          </Typography.Text>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as ReceiptMode)}
            options={[
              {
                label: '核销客户对账单',
                value: 'reconcile',
                icon: <AccountBookOutlined />,
              },
              {
                label: '直接存为预收定金',
                value: 'prepaid',
                icon: <PayCircleOutlined />,
              },
              {
                label: '履约保证金',
                value: 'deposit',
                icon: <SafetyCertificateOutlined />,
              },
            ]}
          />
        </Flex>
      }
      styles={{ body: { paddingTop: token.paddingSM } }}
      footer={
        <Flex justify="space-between" align="center">
          <Space size={16}>
            <Typography.Text type="secondary">
              <UserOutlined /> 经办人：财务部 · 陈明
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ fontSize: token.fontSizeSM }}
            >
              快捷键 <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 提交
            </Typography.Text>
          </Space>
          <Space>
            <Button onClick={() => handleSubmit(true)} loading={submitting}>
              存为草稿
            </Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={() => form.submit()}
            >
              确认收款并核销
            </Button>
          </Space>
        </Flex>
      }
    >
      {contextHolder}
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={() => handleSubmit(false)}
      >
        <Row gutter={24}>
          <Col span={16}>
            <div
              className="rounded-lg p-4"
              style={{
                background: token.colorFillQuaternary,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Flex align="center" gap={16}>
                <Form.Item name="amount" noStyle>
                  <InputNumber
                    size="large"
                    min={0}
                    precision={2}
                    controls={false}
                    prefix="¥"
                    placeholder="0.00"
                    style={{
                      width: 280,
                      fontSize: 32,
                      fontWeight: 600,
                      lineHeight: '48px',
                    }}
                    onChange={handleAmountChange}
                  />
                </Form.Item>
                <Flex vertical>
                  <span
                    style={{
                      color: token.colorTextSecondary,
                      fontSize: token.fontSizeSM,
                    }}
                  >
                    实收金额（元）
                  </span>
                  <div
                    className="mt-1 inline-flex items-center rounded-full px-3 py-0.5"
                    style={{
                      background: token.colorPrimaryBg,
                      color: token.colorPrimary,
                      width: 'fit-content',
                    }}
                  >
                    人民币{digitToChineseUppercase(amount ?? 0)}
                  </div>
                </Flex>
              </Flex>
            </div>

            <Row gutter={12} className="mt-4">
              <Col span={8}>
                <Form.Item
                  name="settlementEntity"
                  label="我方结算主体"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={SETTLEMENT_ENTITIES.map((v) => ({
                      value: v,
                      label: v,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="bizType"
                  label="往来类型"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={BIZ_TYPES.map((v) => ({ value: v, label: v }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="customerId"
                  label="往来客户"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={MOCK_CUSTOMERS.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="receiptDate"
                  label="收款日期"
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="receiptMethod" label="收款方式">
                  <Select
                    options={PAY_METHODS.map((v) => ({ value: v, label: v }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bankAccount" label="入账银行账户">
                  <Select
                    options={BANK_ACCOUNTS.map((v) => ({ value: v, label: v }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            {mode === 'reconcile' ? (
              <div
                className="rounded-lg p-3"
                style={{ border: `1px solid ${token.colorBorderSecondary}` }}
              >
                <Flex justify="space-between" align="center" className="mb-2">
                  <Flex align="center" gap={8}>
                    <AccountBookOutlined />
                    <span className="font-semibold">待核销客户对账单</span>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: token.fontSizeSM }}
                    >
                      {customer.name} · 共 {statements.length} 期未结
                    </Typography.Text>
                  </Flex>
                  <Space size={8}>
                    <Button
                      size="small"
                      icon={<ThunderboltOutlined />}
                      onClick={() => fifoAllocate(amount ?? 0)}
                    >
                      按账期优先自动分配（FIFO）
                    </Button>
                    <Button
                      size="small"
                      icon={<ClearOutlined />}
                      onClick={() => setAllocations({})}
                    >
                      清空分配
                    </Button>
                  </Space>
                </Flex>
                <Table<StatementItem>
                  size="small"
                  rowKey="id"
                  columns={columns}
                  dataSource={statements}
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys: selectedKeys,
                    onChange: (keys) => setSelectedKeys(keys),
                  }}
                  summary={(data) => {
                    const total = data.reduce(
                      (s, r) => s + r.outstandingAmount,
                      0,
                    )
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={4}>
                            <Typography.Text strong>
                              合计（未结清）
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            <Typography.Text strong>
                              {fmtMoney(total)}
                            </Typography.Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2} align="right">
                            <Typography.Text
                              strong
                              type={
                                totalAllocated > (amount ?? 0)
                                  ? 'danger'
                                  : undefined
                              }
                            >
                              {fmtMoney(totalAllocated)}
                            </Typography.Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    )
                  }}
                />
                {totalAllocated > (amount ?? 0) && (
                  <Alert
                    className="mt-2"
                    type="warning"
                    showIcon
                    title={`本次分配核销总额 ${fmtMoney(totalAllocated)} 已超出实收金额 ${fmtMoney(amount)}，请调整分配金额`}
                  />
                )}
              </div>
            ) : (
              <Alert
                className="mt-4"
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                title={
                  mode === 'prepaid'
                    ? '款项全额转预收定金'
                    : '款项计入履约保证金'
                }
                description={
                  mode === 'prepaid'
                    ? `实收 ${fmtMoney(amount)} 元将全额转入「${customer.name}」的预收定金账户，后续可在出货结算时按单冲抵，不参与本期对账单核销。`
                    : `实收 ${fmtMoney(amount)} 元将作为「${customer.name}」的履约保证金暂存，待合作期满或合同履约完成后统一退还或抵扣。`
                }
              />
            )}

            <Divider orientation="left" plain>
              凭证与备注
            </Divider>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="remark" label="备注说明">
                  <Input.TextArea
                    rows={3}
                    placeholder="如：承兑汇票贴现、代付说明等"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="电子回单上传">
                  <Upload.Dragger
                    multiple
                    maxCount={5}
                    beforeUpload={() => false}
                    onChange={({ fileList }) =>
                      setAttachments(fileList.map((f) => f.name))
                    }
                    style={{ padding: 8 }}
                  >
                    <p
                      className="ant-upload-drag-icon"
                      style={{ marginBottom: 4 }}
                    >
                      <InboxOutlined />
                    </p>
                    <Typography.Text
                      type="secondary"
                      style={{ fontSize: token.fontSizeSM }}
                    >
                      点击或拖拽上传银行电子回单（最多 5 份）
                    </Typography.Text>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>
          </Col>

          <Col span={8}>
            <Flex vertical gap={12}>
              <div
                className="rounded-lg p-4"
                style={{ border: `1px solid ${token.colorBorderSecondary}` }}
              >
                <Flex align="center" gap={8} className="mb-3">
                  <AuditOutlined />
                  <span className="font-semibold">客户对账全景</span>
                </Flex>
                <Flex vertical gap={10}>
                  <DashboardStat
                    label="合作账期规则"
                    value={customer.creditTerm}
                  />
                  <DashboardStat
                    label="已对账未结清总额"
                    value={`¥${fmtMoney(customer.totalOutstanding)}`}
                    danger
                  />
                  <DashboardStat
                    label="其中逾期金额"
                    value={`¥${fmtMoney(customer.overdueAmount)}`}
                    danger={customer.overdueAmount > 0}
                  />
                  <DashboardStat
                    label="在途送货未对账"
                    value={`¥${fmtMoney(customer.inTransitAmount)}`}
                  />
                </Flex>
              </div>

              <div
                className="rounded-lg p-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${token.colorPrimary} 0%, #08979c 100%)`,
                }}
              >
                <Flex align="center" gap={8} className="mb-3">
                  <AccountBookOutlined />
                  <span className="font-semibold">动态核销试算</span>
                </Flex>
                <Flex vertical gap={10}>
                  {[
                    { label: '实收金额', value: fmtMoney(amount) },
                    {
                      label: '冲抵对账单总计',
                      value: fmtMoney(totalAllocated),
                    },
                    { label: '多收差额（转预收）', value: fmtMoney(toPrepaid) },
                    {
                      label: '核销后客户剩余欠款',
                      value: fmtMoney(remainingDebt),
                    },
                  ].map((item) => (
                    <Flex
                      key={item.label}
                      justify="space-between"
                      align="center"
                    >
                      <span style={{ opacity: 0.85 }}>{item.label}</span>
                      <Typography.Text
                        strong
                        style={{
                          color: '#fff',
                          fontSize: token.fontSizeLG,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {item.value}
                      </Typography.Text>
                    </Flex>
                  ))}
                </Flex>
                <Divider
                  style={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    margin: '12px 0 0',
                  }}
                />
                <div
                  className="mt-2"
                  style={{ fontSize: token.fontSizeSM, opacity: 0.85 }}
                >
                  人民币{digitToChineseUppercase(amount ?? 0)}
                </div>
              </div>

              <Alert
                type={attachments.length > 0 ? 'success' : 'default'}
                showIcon
                title={
                  attachments.length > 0
                    ? `已上传电子回单 ${attachments.length} 份`
                    : '建议上传银行电子回单作为核销凭证'
                }
              />
            </Flex>
          </Col>
        </Row>
      </Form>

      <Drawer
        title={
          <Space size={8}>
            <span>对账单明细 · {drawerStatement?.statementNo}</span>
            {drawerStatement && (
              <StatementStatusTag statement={drawerStatement} />
            )}
          </Space>
        }
        size={640}
        open={Boolean(drawerStatement)}
        onClose={() => setDrawerStatement(null)}
        destroyOnHidden
      >
        {drawerStatement && (
          <Flex vertical gap={12}>
            <Descriptions
              size="small"
              column={2}
              items={[
                {
                  key: 'period',
                  label: '对账周期',
                  children: `${drawerStatement.periodStart} ~ ${drawerStatement.periodEnd}`,
                },
                {
                  key: 'due',
                  label: '付款到期日',
                  children: drawerStatement.dueDate,
                },
                {
                  key: 'total',
                  label: '对账总额',
                  children: `¥${fmtMoney(drawerStatement.totalAmount)}`,
                },
                {
                  key: 'out',
                  label: '未结清待付',
                  children: `¥${fmtMoney(drawerStatement.outstandingAmount)}`,
                },
              ]}
            />
            <Table<WeighSlipItem>
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={drawerStatement.details}
              columns={[
                {
                  title: '磅单号',
                  dataIndex: 'slipNo',
                  render: (v: string) => (
                    <Typography.Text
                      style={{
                        fontFamily: token.fontFamilyCode,
                        fontSize: token.fontSizeSM,
                      }}
                    >
                      {v}
                    </Typography.Text>
                  ),
                },
                {
                  title: '品名规格',
                  render: (_, r) => `${r.productName} ${r.spec}`,
                },
                {
                  title: '净重(t)',
                  dataIndex: 'netWeight',
                  align: 'right',
                  render: (v: number) => v.toFixed(2),
                },
                {
                  title: '单价',
                  dataIndex: 'unitPrice',
                  align: 'right',
                  render: (v: number) => fmtMoney(v),
                },
                {
                  title: '小计',
                  dataIndex: 'subtotal',
                  align: 'right',
                  render: (v: number) => fmtMoney(v),
                },
                {
                  title: '扣减说明',
                  dataIndex: 'deductionNote',
                  render: (v?: string) =>
                    v ? (
                      <Typography.Text
                        type="warning"
                        style={{ fontSize: token.fontSizeSM }}
                      >
                        {v}
                      </Typography.Text>
                    ) : (
                      '-'
                    ),
                },
              ]}
              summary={(data) => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      <Typography.Text strong>合计</Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Typography.Text strong>
                        {fmtMoney(data.reduce((s, r) => s + r.subtotal, 0))}
                      </Typography.Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Flex>
        )}
      </Drawer>
    </Modal>
  )
}
