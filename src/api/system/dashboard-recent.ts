import dayjs from 'dayjs'
import { fetchModulePage } from '@/api/business/business-listing-fetch'

/** 工作台「最近单据」页签对应的模块 */
export const DASHBOARD_RECENT_TABS = [
  'purchase-order',
  'sales-outbound',
  'freight-bill',
  'customer-statement',
] as const

export type DashboardRecentTab = (typeof DASHBOARD_RECENT_TABS)[number]

export interface DashboardRecentDocument {
  id: string
  docNo: string
  counterpartyName: string
  amount: number | null
  status: string
  businessDate: string
}

interface RecentSourceRow {
  id: string
  docNo: string
  counterpartyName: string
  amount: number | null
  status: string
  businessDate: string
}

const RECENT_PAGE_SIZE = 5

const RECENT_QUERY: Record<
  DashboardRecentTab,
  { sortBy: string; no: string; counterparty: string; date: string }
> = {
  'purchase-order': {
    sortBy: 'orderDate',
    no: 'orderNo',
    counterparty: 'supplierName',
    date: 'orderDate',
  },
  'sales-outbound': {
    sortBy: 'outboundDate',
    no: 'outboundNo',
    counterparty: 'customerName',
    date: 'outboundDate',
  },
  'freight-bill': {
    sortBy: 'billTime',
    no: 'billNo',
    counterparty: 'carrierName',
    date: 'billTime',
  },
  'customer-statement': {
    sortBy: 'endDate',
    no: 'statementNo',
    counterparty: 'customerName',
    date: 'endDate',
  },
}

function pickText(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value : ''
}

function pickNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** 按模块抓取最近 N 条单据（复用各模块分页接口，按业务日期倒序） */
export async function fetchDashboardRecentDocuments(
  tab: DashboardRecentTab,
): Promise<DashboardRecentDocument[]> {
  const query = RECENT_QUERY[tab]
  const page = await fetchModulePage(
    tab,
    { sortBy: query.sortBy, direction: 'desc' },
    0,
    RECENT_PAGE_SIZE,
  )
  const documents = page.rows.map<DashboardRecentDocument>((rawRow) => {
    const row = rawRow as Record<string, unknown>
    const source: RecentSourceRow = {
      id: pickText(row, 'id'),
      docNo: pickText(row, query.no),
      counterpartyName: pickText(row, query.counterparty),
      amount:
        pickNumber(row, 'totalAmount') ?? pickNumber(row, 'closingAmount'),
      status: pickText(row, 'status'),
      businessDate: pickText(row, query.date),
    }
    return source
  })
  return documents.filter((doc) => doc.docNo !== '')
}

export interface DashboardMonthCounts {
  outbound: number
  inbound: number
  receipt: number
}

const MONTH_RANGE = {
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
} as const

async function fetchMonthTotal(
  moduleKey: 'sales-outbound' | 'purchase-inbound' | 'receipt',
): Promise<number> {
  const page = await fetchModulePage(moduleKey, { ...MONTH_RANGE }, 0, 1)
  return page.totalElements
}

/** 本月出库 / 入库 / 回款单量（复用各模块分页接口的 total，无需后端新增接口） */
export async function fetchDashboardMonthCounts(): Promise<DashboardMonthCounts> {
  const [outbound, inbound, receipt] = await Promise.all([
    fetchMonthTotal('sales-outbound'),
    fetchMonthTotal('purchase-inbound'),
    fetchMonthTotal('receipt'),
  ])
  return { outbound, inbound, receipt }
}

/**
 * 待入库采购订单数（单据状态=已审核）。
 * 采购订单整单交付：已审核=等待入库（未发货），完成采购=已全部入库。
 */
export async function fetchDashboardAwaitingInboundCount(): Promise<number> {
  const page = await fetchModulePage(
    'purchase-order',
    { status: '已审核' },
    0,
    1,
  )
  return page.totalElements
}
