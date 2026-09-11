import dayjs, { type Dayjs } from 'dayjs'

export interface WeighSlipItem {
  id: string
  slipNo: string
  productName: string
  spec: string
  netWeight: number
  unitPrice: number
  subtotal: number
  deductionNote?: string
}

export interface StatementItem {
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

export interface CustomerData {
  id: string
  name: string
  creditTerm: string
  totalOutstanding: number
  overdueAmount: number
  inTransitAmount: number
  statements: StatementItem[]
}

export type ReceiptMode = 'reconcile' | 'prepaid' | 'deposit'

export interface FormValues {
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

export function digitToChineseUppercase(n: number): string {
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

export const fmtMoney = (n?: number): string =>
  (n ?? 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const MOCK_CUSTOMERS: CustomerData[] = [
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

export const SETTLEMENT_ENTITIES = ['颖捷建材', '杭州供应链管理']
export const BIZ_TYPES = ['销售收款', '预收定金', '履约保证金', '往来冲抵']
export const PAY_METHODS = ['银行转账', '银行承兑汇票', '现金', '线上支付']
export const BANK_ACCOUNTS = [
  '工行杭州城东支行 **** 8891',
  '建行杭州滨江支行 **** 3356',
  '招行杭州分行营业部 **** 1024',
]
