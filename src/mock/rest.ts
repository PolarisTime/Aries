import dayjs from 'dayjs'
import { businessPageConfigs } from '@/config/business-pages'
import { businessDataMap } from '@/mock/business-data'
import type { TableResponse } from '@/types/api'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface MockRequestOptions {
  params?: Record<string, unknown>
  data?: unknown
}

interface SaveResponse {
  code: number
  data?: ModuleRecord
  message?: string
}

interface DeleteResponse {
  code: number
  message?: string
}

interface MockPrintTemplateRecord {
  id: number
  billType: string
  templateName: string
  templateHtml: string
  isDefault: string
  source: 'db'
  updateTime: string
}

let printTemplateSeed = 2

const printTemplateRecords: MockPrintTemplateRecord[] = [
  {
    id: 1,
    billType: 'sales-outbounds',
    templateName: '销售出库标准模板',
    templateHtml: `<div style="padding:10px;">
<h2>销售出库单</h2>
<table style="border:none;width:100%;margin-bottom:8px;">
<tr class="header-row">
  <td style="border:none;">单据编号：{{outboundNo}}</td>
  <td style="border:none;">客户：{{customerName}}</td>
  <td style="border:none;">项目：{{projectName}}</td>
  <td style="border:none;">日期：{{outboundDate}}</td>
</tr>
</table>
<table>
<thead><tr><th>序号</th><th>商品编码</th><th>规格</th><th>吨位</th><th>单价</th><th>金额</th></tr></thead>
<tbody>
<!--DETAIL_ROW_START-->
<tr>
  <td>{{_index}}</td><td>{{detail.materialCode}}</td><td>{{detail.spec}}</td><td>{{detail.weightTon}}</td><td>{{detail.unitPrice}}</td><td>{{detail.amount}}</td>
</tr>
<!--DETAIL_ROW_END-->
</tbody>
</table>
<p style="text-align:right;font-size:11px;margin-top:10px;">打印日期：{{_printDate}}</p>
</div>`,
    isDefault: '1',
    source: 'db',
    updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  },
]

function wait(ms = 120) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function parseSearch(raw: unknown) {
  if (!raw) {
    return {}
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return raw as Record<string, unknown>
}

function includesKeyword(value: unknown, keyword: string) {
  return String(value || '')
    .toLowerCase()
    .includes(keyword.trim().toLowerCase())
}

function matchesFilter(
  record: ModuleRecord,
  config: ModulePageConfig,
  key: string,
  filterValue: unknown,
) {
  const definition = config.filters.find((item) => item.key === key)
  const recordValue = record[key]

  if (!definition || filterValue === undefined || filterValue === null || filterValue === '') {
    return true
  }

  if (definition.type === 'input') {
    const keyword = String(filterValue || '').trim()
    if (!keyword) {
      return true
    }

    return Object.values(record).some((value) => includesKeyword(value, keyword))
  }

  if (definition.type === 'select') {
    return String(recordValue || '') === String(filterValue || '')
  }

  if (definition.type === 'dateRange' && Array.isArray(filterValue)) {
    const [start, end] = filterValue
    if (!start || !end || !recordValue) {
      return true
    }

    const current = dayjs(String(recordValue))
    return (
      current.isAfter(dayjs(String(start)).startOf('day')) ||
      current.isSame(dayjs(String(start)).startOf('day'))
    ) &&
      (
        current.isBefore(dayjs(String(end)).endOf('day')) ||
        current.isSame(dayjs(String(end)).endOf('day'))
      )
  }

  return true
}

function parseRelationNos(value: unknown) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[，,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function sumItemsBy(record: ModuleRecord, key: string) {
  return Array.isArray(record.items)
    ? record.items.reduce((sum, item) => sum + Number(item[key] || 0), 0)
    : 0
}

function syncTradeTotals(record: ModuleRecord) {
  if (!Array.isArray(record.items)) {
    return
  }

  record.totalWeight = Number(sumItemsBy(record, 'weightTon').toFixed(3))
  record.totalAmount = Number(sumItemsBy(record, 'amount').toFixed(2))
}

function cloneOutboundItemsFromOrder(orderRecord: ModuleRecord, outboundRecord: ModuleRecord) {
  outboundRecord.items = clone(Array.isArray(orderRecord.items) ? orderRecord.items : []).map((item, index) => ({
    ...item,
    id: String(item.id || `${outboundRecord.id}-item-${index + 1}`),
  }))
  syncTradeTotals(outboundRecord)
}

function syncBusinessRelations() {
  const purchaseOrders = businessDataMap['purchase-orders'] || []
  const purchaseInbounds = businessDataMap['purchase-inbounds'] || []
  const salesOrders = businessDataMap['sales-orders'] || []
  const salesOutbounds = businessDataMap['sales-outbounds'] || []
  const freightBills = businessDataMap['freight-bills'] || []

  ;[...purchaseOrders, ...purchaseInbounds, ...salesOrders, ...salesOutbounds].forEach(syncTradeTotals)

  freightBills.forEach((record) => {
    record.totalWeight = Number(sumItemsBy(record, 'weightTon').toFixed(3))
    record.totalFreight = Number((Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(2))
  })

  purchaseOrders.forEach((record) => {
    const orderNo = String(record.orderNo || '')
    const relatedInbounds = purchaseInbounds.filter((inbound) =>
      parseRelationNos(inbound.purchaseOrderNo).includes(orderNo),
    )

    if (relatedInbounds.some((inbound) => ['已审核', '完成入库'].includes(String(inbound.status || '')))) {
      record.status = '完成采购'
      return
    }

    record.status = String(record.status || '') === '草稿' ? '草稿' : '已审核'
  })

  purchaseInbounds.forEach((record) => {
    const inboundNo = String(record.inboundNo || '')
    const relatedOrders = salesOrders.filter((order) =>
      parseRelationNos(order.purchaseInboundNo).includes(inboundNo),
    )

    if (relatedOrders.length) {
      record.status = '完成入库'
      return
    }

    record.status = String(record.status || '') === '草稿' || String(record.status || '') === '未审核'
      ? '草稿'
      : '已审核'
  })

  salesOutbounds.forEach((record) => {
    const currentStatus = String(record.status || '')
    if (['价格核准', '已核准', '已完成'].includes(currentStatus)) {
      record.status = '价格核准'
      return
    }

    record.status = currentStatus === '草稿' || currentStatus === '未审核'
      ? '草稿'
      : '已审核'
  })

  salesOrders.forEach((record) => {
    const orderNo = String(record.orderNo || '')
    const relatedOutbounds = salesOutbounds.filter((outbound) =>
      parseRelationNos(outbound.salesOrderNo).includes(orderNo),
    )

    if (relatedOutbounds.some((outbound) => String(outbound.status || '') === '价格核准')) {
      record.status = '完成销售'
      relatedOutbounds
        .filter((outbound) => String(outbound.status || '') === '价格核准')
        .forEach((outbound) => {
          outbound.customerName = record.customerName || outbound.customerName || ''
          outbound.projectName = record.projectName || outbound.projectName || ''
          outbound.remark = record.remark || outbound.remark || ''
          cloneOutboundItemsFromOrder(record, outbound)
        })
      return
    }

    if (!relatedOutbounds.length) {
      record.status = String(record.status || '') === '草稿' ? '草稿' : '已审核'
      return
    }

    record.status = '已审核'
  })
}

function paginateRows<T>(rows: T[], currentPage = 1, pageSize = 20): TableResponse<T> {
  const start = Math.max(currentPage - 1, 0) * pageSize
  return {
    code: 200,
    data: {
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    },
  }
}

function listModuleRecords(moduleKey: string, params?: Record<string, unknown>) {
  const config = businessPageConfigs[moduleKey]
  const sourceRows = businessDataMap[moduleKey] || []
  if (!config) {
    return {
      code: 404,
      message: `Mock module "${moduleKey}" not found`,
    }
  }

  syncBusinessRelations()

  const search = parseSearch(params?.search)
  const currentPage = Number(params?.currentPage || 1)
  const pageSize = Number(params?.pageSize || 20)

  const filteredRows = sourceRows.filter((record) =>
    Object.entries(search).every(([key, value]) => matchesFilter(record, config, key, value)),
  )

  return paginateRows(filteredRows, currentPage, pageSize)
}

function saveModuleRecord(moduleKey: string, payload: unknown): SaveResponse {
  const config = businessPageConfigs[moduleKey]
  const sourceRows = businessDataMap[moduleKey]

  if (!config || !sourceRows) {
    return {
      code: 404,
      message: `Mock module "${moduleKey}" not found`,
    }
  }

  const incomingRecord = clone((payload || {}) as ModuleRecord)
  const normalizedRecord: ModuleRecord = {
    ...incomingRecord,
    id: String(incomingRecord.id || `${moduleKey}-${Date.now()}`),
    items: Array.isArray(incomingRecord.items) ? incomingRecord.items : [],
  }

  if (['purchase-orders', 'purchase-inbounds', 'sales-orders', 'sales-outbounds'].includes(moduleKey) && !normalizedRecord.status) {
    normalizedRecord.status = '草稿'
  }

  const currentIndex = sourceRows.findIndex((row) => row.id === normalizedRecord.id)
  if (currentIndex >= 0) {
    sourceRows.splice(currentIndex, 1, normalizedRecord)
  } else {
    sourceRows.unshift(normalizedRecord)
  }

  if (moduleKey === 'sales-orders' && String(normalizedRecord.status || '') === '完成销售') {
    const orderNo = String(normalizedRecord.orderNo || '')
    ;(businessDataMap['sales-outbounds'] || []).forEach((outbound) => {
      if (!parseRelationNos(outbound.salesOrderNo).includes(orderNo)) {
        return
      }

      outbound.status = '价格核准'
      outbound.customerName = normalizedRecord.customerName || outbound.customerName || ''
      outbound.projectName = normalizedRecord.projectName || outbound.projectName || ''
      outbound.remark = normalizedRecord.remark || outbound.remark || ''
      cloneOutboundItemsFromOrder(normalizedRecord, outbound)
    })
  }

  syncBusinessRelations()

  return {
    code: 200,
    data: normalizedRecord,
    message: '保存成功',
  }
}

function deleteModuleRecord(moduleKey: string, id: string): DeleteResponse {
  const sourceRows = businessDataMap[moduleKey]

  if (!sourceRows) {
    return {
      code: 404,
      message: `Mock module "${moduleKey}" not found`,
    }
  }

  const currentIndex = sourceRows.findIndex((row) => String(row.id) === String(id))
  if (currentIndex < 0) {
    return {
      code: 404,
      message: '记录不存在',
    }
  }

  sourceRows.splice(currentIndex, 1)
  syncBusinessRelations()

  return {
    code: 200,
    message: '删除成功',
  }
}

export async function mockRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  url: string,
  options?: MockRequestOptions,
): Promise<T> {
  await wait()

  const normalizedUrl = url.replace(/^\/mock-api/, '')

  if (method === 'GET' && normalizedUrl === '/printTemplate/getByBillType') {
    const billType = String(options?.params?.billType || '')
    const record = printTemplateRecords.find((item) => item.billType === billType && item.isDefault === '1') || null
    return clone({
      code: 200,
      data: record,
    } as T)
  }

  if (method === 'GET' && normalizedUrl === '/printTemplate/listByBillType') {
    const billType = String(options?.params?.billType || '')
    return clone({
      code: 200,
      data: printTemplateRecords
        .filter((item) => item.billType === billType)
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault)),
    } as T)
  }

  if (method === 'POST' && normalizedUrl === '/printTemplate/save') {
    const payload = clone((options?.data || {}) as Partial<MockPrintTemplateRecord>)
    const billType = String(payload.billType || '')
    const isDefault = String(payload.isDefault || '1')
    if (isDefault === '1') {
      printTemplateRecords.forEach((item) => {
        if (item.billType === billType) {
          item.isDefault = '0'
        }
      })
    }
    if (payload.id) {
      const target = printTemplateRecords.find((item) => item.id === Number(payload.id))
      if (target) {
        target.templateName = String(payload.templateName || target.templateName)
        target.templateHtml = String(payload.templateHtml || target.templateHtml)
        target.isDefault = isDefault
        target.updateTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      }
    } else {
      printTemplateRecords.unshift({
        id: printTemplateSeed++,
        billType,
        templateName: String(payload.templateName || '未命名模板'),
        templateHtml: String(payload.templateHtml || ''),
        isDefault,
        source: 'db',
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      })
    }
    return clone({
      code: 200,
      data: '成功',
    } as T)
  }

  if (method === 'DELETE' && normalizedUrl === '/printTemplate/delete') {
    const id = Number(options?.params?.id || 0)
    const index = printTemplateRecords.findIndex((item) => item.id === id)
    if (index >= 0) {
      printTemplateRecords.splice(index, 1)
    }
    return clone({
      code: 200,
      data: '成功',
    } as T)
  }

  const saveMatch = normalizedUrl.match(/^\/rest\/modules\/([^/]+)\/save$/)
  if (method === 'POST' && saveMatch) {
    return clone(saveModuleRecord(saveMatch[1], options?.data) as T)
  }

  const deleteMatch = normalizedUrl.match(/^\/rest\/modules\/([^/]+)\/([^/]+)$/)
  if (method === 'DELETE' && deleteMatch) {
    return clone(deleteModuleRecord(deleteMatch[1], decodeURIComponent(deleteMatch[2])) as T)
  }

  const listMatch = normalizedUrl.match(/^\/rest\/modules\/([^/]+)$/)
  if (method === 'GET' && listMatch) {
    const moduleKey = listMatch[1]
    return clone(listModuleRecords(moduleKey, options?.params) as T)
  }

  throw new Error(`Unsupported mock REST request: ${method} ${url}`)
}
