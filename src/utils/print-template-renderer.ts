/**
 * 前端模版渲染器 — 将 COORD/HTML 模版 + 原始数据渲染为可执行的 LODOP 脚本。
 * 从后端 PrintScriptService 迁移而来，保持业务逻辑一致。
 */

// ─── 常量 ─────────────────────────────────────────────

const COIL_CATEGORIES = new Set(['盘螺', '线材'])
const BRAND_DISPLAY_LENGTH = 2
const WEIGHT_SCALE = 3
const PRICE_SCALE = 2

interface CoordLayout {
  tableTop: number
  rowH: number
  maxRows: number
  pageH: number
}

const COORD_LAYOUTS: Record<string, CoordLayout> = {
  'sales-outbound': { tableTop: 138, rowH: 24, maxRows: 10, pageH: 0 },
  'freight-bill': { tableTop: 164, rowH: 20, maxRows: 50, pageH: 0 },
  'freight-statement': { tableTop: 130, rowH: 20, maxRows: 50, pageH: 0 },
  'customer-statement': { tableTop: 130, rowH: 20, maxRows: 50, pageH: 1050 },
}

// ─── 类型 ─────────────────────────────────────────────

export interface PrintDataRow {
  [key: string]: string
}

export interface RenderResult {
  type: 'COORD' | 'HTML'
  script?: string
  html?: string
}

// ─── 安全转义 ─────────────────────────────────────────

/** 转义 JS 单引号字符串中的特殊字符 */
export function escapeJs(value: string): string {
  if (!value) return ''
  let result = ''
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    switch (c) {
      case '"':
        result += '\\"'
        break
      case "'":
        result += "\\'"
        break
      case '\\':
        result += '\\\\'
        break
      case '\n':
        result += '\\n'
        break
      case '\r':
        result += '\\r'
        break
      case '\t':
        result += '\\t'
        break
      case '<':
        result += '\\x3c'
        break
      case '>':
        result += '\\x3e'
        break
      default: {
        const code = c.charCodeAt(0)
        if (code < 0x20) {
          result += `\\x${code.toString(16).padStart(2, '0')}`
        } else {
          result += c
        }
      }
    }
  }
  return result
}

// ─── 工具函数 ─────────────────────────────────────────

function safeDecimal(val: string | undefined): number {
  if (!val?.trim()) return 0
  const n = Number(val.trim())
  return Number.isNaN(n) ? 0 : n
}

function formatDecimal(val: string | undefined, scale: number): string {
  const d = safeDecimal(val)
  if (d === 0) return ''
  return d.toFixed(scale)
}

// ─── 顶层字段加工 ─────────────────────────────────────

function enrichTopLevel(data: PrintDataRow): void {
  // snake_case → camelCase 兼容（JDBC 返回下划线命名，模版用驼峰）
  const snakeToCamel: Array<[string, string]> = [
    ['customer_name', 'customerName'],
    ['project_name', 'projectName'],
    ['outbound_no', 'outboundNo'],
    ['outbound_date', 'outboundDate'],
    ['order_no', 'orderNo'],
    ['order_date', 'orderDate'],
    ['inbound_no', 'inboundNo'],
    ['inbound_date', 'inboundDate'],
    ['delivery_date', 'deliveryDate'],
    ['supplier_name', 'supplierName'],
    ['buyer_name', 'buyerName'],
    ['sales_name', 'salesName'],
    ['sales_order_no', 'salesOrderNo'],
    ['purchase_order_no', 'purchaseOrderNo'],
    ['total_weight', 'totalWeight'],
    ['total_amount', 'totalAmount'],
    ['carrier_name', 'carrierName'],
    ['vehicle_plate', 'vehiclePlate'],
    ['total_freight', 'totalFreight'],
    ['delivery_status', 'deliveryStatus'],
    ['statement_no', 'statementNo'],
    ['start_date', 'startDate'],
    ['end_date', 'endDate'],
    ['purchase_amount', 'purchaseAmount'],
    ['payment_amount', 'paymentAmount'],
    ['closing_amount', 'closingAmount'],
    ['sales_amount', 'salesAmount'],
    ['receipt_amount', 'receiptAmount'],
    ['paid_amount', 'paidAmount'],
    ['sign_status', 'signStatus'],
    ['bill_no', 'billNo'],
    ['bill_time', 'billTime'],
  ]
  for (const [snake, camel] of snakeToCamel) {
    if (!data[camel] && data[snake]) data[camel] = data[snake]
  }

  const now = new Date()
  if (!data._printDate) {
    data._printDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
  }
  if (!data._printTime) {
    data._printTime = [
      data._printDate,
      [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
      ].join(':'),
    ].join(' ')
  }

  const outboundNo = data.outboundNo || data.outbound_no || ''
  if (!data._billNoLabel) {
    data._billNoLabel = outboundNo ? `单据号:${outboundNo}` : '单据号：'
  }
  if (!data.outboundNoLabel) {
    data.outboundNoLabel = outboundNo
  }

  // 日期解析（A5 用）
  const outboundDate = data.outboundDate || data.outbound_date || ''
  if (outboundDate && !data._dateYear) {
    const m = outboundDate.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/)
    if (m) {
      data._dateYear = m[1]
      data._dateMonth = m[2].padStart(2, '0')
      data._dateDay = m[3].padStart(2, '0')
    }
  }
}

// ─── 明细行加工 ───────────────────────────────────────

function enrichItems(
  rawItems: PrintDataRow[],
  data: PrintDataRow,
  layout: CoordLayout,
  moduleKey: string,
): PrintDataRow[] {
  const enriched: PrintDataRow[] = []
  let totalWeight = 0
  let totalAmount = 0
  let totalQuantity = 0

  const needsGrouping = moduleKey === 'freight-bill'

  // 物流单按 projectName 分组
  let flatItems: PrintDataRow[]
  if (needsGrouping && rawItems.length > 0) {
    const groupMap = new Map<string, PrintDataRow[]>()
    const groupOrder: string[] = []
    for (const item of rawItems) {
      const pn = item.projectName || ''
      if (!groupMap.has(pn)) {
        groupOrder.push(pn)
        groupMap.set(pn, [])
      }
      groupMap.get(pn)!.push(item)
    }
    flatItems = []
    for (const pn of groupOrder) {
      flatItems.push(...groupMap.get(pn)!)
      if (pn) {
        flatItems.push({ _isSeparator: 'true', _groupName: pn })
      }
    }
  } else {
    flatItems = [...rawItems]
  }

  let seq = 1
  let rowTop = layout.tableTop
  let prevBillNo: string | null = null

  for (const item of flatItems) {
    const enrichedItem: PrintDataRow = { ...item }

    if (item._isSeparator !== 'true') {
      enrichedItem._index = String(seq++)

      // snake_case → camelCase 兼容
      for (const [snake, camel] of ITEM_SNAKE_TO_CAMEL) {
        if (!enrichedItem[camel] && enrichedItem[snake]) enrichedItem[camel] = enrichedItem[snake]
      }
      const weightTon = enrichedItem.weightTon || ''
      const unitPrice = enrichedItem.unitPrice || ''

      // 件重显示
      const category = item.category || ''
      const isCoil = COIL_CATEGORIES.has(category)
      let pieceWeightDisplay = '-'
      if (!isCoil) {
        const w = safeDecimal(weightTon)
        const q = safeDecimal(item.quantity)
        if (w > 0 && q > 0) {
          pieceWeightDisplay = (w / q).toFixed(WEIGHT_SCALE)
        }
      }
      enrichedItem.pieceWeightDisplay = pieceWeightDisplay

      // 品牌显示（取后 N 位）
      const brand = item.brand || ''
      enrichedItem.brandDisplay =
        brand.length > BRAND_DISPLAY_LENGTH
          ? brand.substring(brand.length - BRAND_DISPLAY_LENGTH)
          : brand

      // 数字格式化
      enrichedItem.weightTonDisplay = formatDecimal(weightTon, WEIGHT_SCALE)
      enrichedItem.unitPriceDisplay = formatDecimal(unitPrice, PRICE_SCALE)
      enrichedItem.amountDisplay = formatDecimal(item.amount, PRICE_SCALE)

      // A4 竖版分页
      if (layout.pageH > 0 && rowTop + layout.rowH * 2 > layout.pageH) {
        enrichedItem._needsNewPage = 'true'
        rowTop = 20
      }

      // 对账单单号分隔
      const billNo = item.sourceNo || ''
      if (prevBillNo !== null && billNo !== prevBillNo && billNo) {
        enrichedItem._needsSeparator = 'true'
      }
      prevBillNo = billNo

      // 汇总
      totalWeight += safeDecimal(weightTon)
      totalAmount += safeDecimal(item.amount)
      totalQuantity += parseInt(item.quantity || '0', 10)
    }

    enrichedItem._rowTop = String(rowTop)
    enriched.push(enrichedItem)
    rowTop += layout.rowH
  }

  // 合计
  data.totalWeight = String(totalWeight)
  data.totalWeightDisplay = totalWeight.toFixed(WEIGHT_SCALE)
  data.totalAmount = totalAmount.toFixed(PRICE_SCALE)
  data.totalQuantity = String(totalQuantity)

  const itemCount = flatItems.filter((i) => i._isSeparator !== 'true').length
  const actualItemCount = needsGrouping ? flatItems.length : Math.min(itemCount, layout.maxRows)
  const sumTop = needsGrouping
    ? layout.tableTop + actualItemCount * layout.rowH
    : layout.tableTop + layout.maxRows * layout.rowH
  data._sumTop = String(sumTop)
  data._sumTop2 = String(sumTop + 2)

  const footerTop = sumTop + 40
  data._footerTop = String(footerTop)
  data._footerLineTop = String(footerTop + 28)
  data._footerDateTop = String(footerTop + 34)

  const hasEmptyRows = !needsGrouping && itemCount < layout.maxRows
  data._hasEmptyRows = hasEmptyRows ? 'true' : ''
  data._emptyRowTop = String(layout.tableTop + itemCount * layout.rowH)

  return enriched
}

// ─── 模版展开 ─────────────────────────────────────────

// 明细行 snake_case → camelCase 映射
const ITEM_SNAKE_TO_CAMEL: Array<[string, string]> = [
  ['material_code', 'materialCode'],
  ['piece_weight_ton', 'pieceWeightTon'],
  ['pieces_per_bundle', 'piecesPerBundle'],
  ['weight_ton', 'weightTon'],
  ['unit_price', 'unitPrice'],
  ['warehouse_name', 'warehouseName'],
  ['batch_no', 'batchNo'],
  ['source_no', 'sourceNo'],
  ['material_name', 'materialName'],
  ['customer_name', 'customerName'],
  ['project_name', 'projectName'],
]

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g
const EACH_BLOCK_RE = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
const IF_BLOCK_RE = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g
const JS_LINE_RE =
  /^\s*(var\s|let\s|const\s|for\s*\(|if\s*\(|while\s*\(|function\s|=>|\})\s*$/i

function expandEachBlocks(
  source: string,
  items: PrintDataRow[],
  _layout: CoordLayout,
): string {
  return source.replace(EACH_BLOCK_RE, (_match, _field: string, inner: string) => {
    let expanded = ''
    for (const item of items) {
      expanded += inner.replace(PLACEHOLDER_RE, (_m, key: string) =>
        escapeJs(item[key] || ''),
      )
    }
    return expanded
  })
}

function expandIfBlocks(source: string, data: PrintDataRow): string {
  return source.replace(IF_BLOCK_RE, (_match, field: string, inner: string) => {
    const value = data[field] || ''
    const isTruthy = value !== '' && value !== 'false' && value !== '0'
    return isTruthy ? inner : ''
  })
}

function removeJsLines(source: string): string {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return true
      if (
        trimmed.startsWith('LODOP.') ||
        trimmed.startsWith('{{') ||
        trimmed.startsWith('<!--')
      ) {
        return true
      }
      return !JS_LINE_RE.test(trimmed)
    })
    .join('\n')
    .trim()
}

// ─── HTML 模版渲染 ────────────────────────────────────

const DETAIL_BLOCK_RE =
  /<!--DETAIL_ROW_START-->([\s\S]*?)<!--DETAIL_ROW_END-->/g
const DETAIL_PLACEHOLDER_RE = /\{\{detail\.(\w+)\}\}/g

function renderHtmlTemplate(
  templateHtml: string,
  data: PrintDataRow,
  items: PrintDataRow[],
): string {
  enrichTopLevel(data)

  // 展开 <!--DETAIL_ROW_START-->...<!--DETAIL_ROW_END--> 明细行
  let html = templateHtml.replace(
    DETAIL_BLOCK_RE,
    (_match, rowTemplate: string) => {
      if (!items.length) return ''
      return items
        .map((item) => {
          // snake_case → camelCase
          for (const [snake, camel] of ITEM_SNAKE_TO_CAMEL) {
            if (!item[camel] && item[snake]) item[camel] = item[snake]
          }
          return rowTemplate.replace(
            DETAIL_PLACEHOLDER_RE,
            (_m, key: string) => escapeJs(item[key] || ''),
          )
        })
        .join('')
    },
  )

  // 替换主表 {{xxx}} 占位符
  html = html.replace(PLACEHOLDER_RE, (_match, key: string) =>
    escapeJs(data[key] || ''),
  )

  return html
}

// ─── COORD 模版渲染 ───────────────────────────────────

function renderCoordTemplate(
  templateHtml: string,
  data: PrintDataRow,
  rawItems: PrintDataRow[],
  moduleKey: string,
): string {
  const layout = COORD_LAYOUTS[moduleKey] || { tableTop: 130, rowH: 20, maxRows: 50, pageH: 0 }

  const items = enrichItems(rawItems, data, layout, moduleKey)
  enrichTopLevel(data)

  let source = templateHtml
  source = expandEachBlocks(source, items, layout)
  source = expandIfBlocks(source, data)
  source = source.replace(PLACEHOLDER_RE, (_match, key: string) =>
    escapeJs(data[key] || ''),
  )
  source = removeJsLines(source)

  return source
}

// ─── 主入口 ───────────────────────────────────────────

/**
 * 渲染打印模版。
 * @param templateHtml 模版原始内容
 * @param templateType "COORD" | "HTML"
 * @param data 单据主表数据
 * @param items 单据明细行
 * @param moduleKey 业务模块标识
 */
export function renderPrintTemplate(
  templateHtml: string,
  templateType: string,
  data: PrintDataRow,
  items: PrintDataRow[],
  moduleKey: string,
): RenderResult {
  if (templateType === 'COORD') {
    const script = renderCoordTemplate(templateHtml, data, items, moduleKey)
    return { type: 'COORD', script }
  }
  const html = renderHtmlTemplate(templateHtml, data, items)
  return { type: 'HTML', html }
}
