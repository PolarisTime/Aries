import type {
  ModuleColumnDefinition,
  ModuleDetailField,
  ModulePageConfig,
} from '@/types/module-page'

export interface PrintTemplateTokenDescriptor {
  key: string
  label: string
  token: string
  description?: string
}

export interface PrintTemplateTokenGroup {
  key: string
  label: string
  description?: string
  tokens: PrintTemplateTokenDescriptor[]
}

export interface PrintTemplateSnippet {
  key: string
  label: string
  description: string
  content: string
}

export interface PrintTemplatePreviewData {
  model: Record<string, unknown>
  details: Array<Record<string, unknown>>
}

const sampleDates = ['2026-04-26', '2026-04-27', '2026-04-28']
const sampleWarehouses = ['一号仓', '二号仓', '三号仓']
const sampleCustomers = ['华东建设集团', '申桥钢构工程', '远海供应链']
const sampleSuppliers = ['宝钢资源', '日照钢铁', '山钢供应链']
const sampleProjects = ['虹桥枢纽项目', '浦东厂房项目', '嘉兴码头项目']

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function inferAlign(column: ModuleColumnDefinition) {
  if (column.align) {
    return column.align
  }
  if (
    column.type === 'amount' ||
    column.type === 'weight' ||
    column.type === 'count'
  ) {
    return 'right'
  }
  return 'left'
}

function inferRowValue(
  key: string,
  type: ModuleColumnDefinition['type'] | ModuleDetailField['type'],
  index = 0,
) {
  const normalizedKey = key.toLowerCase()

  if (type === 'date' || normalizedKey.includes('date')) {
    return sampleDates[index % sampleDates.length]
  }
  if (
    type === 'amount' ||
    normalizedKey.includes('amount') ||
    normalizedKey.includes('price')
  ) {
    return (1280 + index * 135.5).toFixed(2)
  }
  if (
    type === 'weight' ||
    normalizedKey.includes('weight') ||
    normalizedKey.includes('ton')
  ) {
    return (12.36 + index * 1.28).toFixed(3)
  }
  if (
    type === 'count' ||
    normalizedKey.includes('quantity') ||
    normalizedKey.includes('pieces')
  ) {
    return String(18 + index * 6)
  }
  if (normalizedKey.endsWith('no')) {
    return `NO-20260426-${String(index + 1).padStart(3, '0')}`
  }
  if (normalizedKey.includes('supplier')) {
    return sampleSuppliers[index % sampleSuppliers.length]
  }
  if (normalizedKey.includes('customer')) {
    return sampleCustomers[index % sampleCustomers.length]
  }
  if (normalizedKey.includes('warehouse') || normalizedKey.includes('dock')) {
    return sampleWarehouses[index % sampleWarehouses.length]
  }
  if (normalizedKey.includes('project')) {
    return sampleProjects[index % sampleProjects.length]
  }
  if (normalizedKey.includes('buyer')) {
    return '王采购'
  }
  if (normalizedKey.includes('sales')) {
    return '李销售'
  }
  if (normalizedKey.includes('carrier')) {
    return '速达物流'
  }
  if (normalizedKey.includes('driver')) {
    return '张师傅'
  }
  if (normalizedKey.includes('phone') || normalizedKey.includes('mobile')) {
    return '13800138000'
  }
  if (normalizedKey.includes('brand')) {
    return '宝钢'
  }
  if (normalizedKey === 'category') {
    return '螺纹钢'
  }
  if (normalizedKey.includes('materialcode')) {
    return index % 2 === 0 ? 'HRB400E-18' : 'Q235B-20'
  }
  if (normalizedKey === 'material') {
    return index % 2 === 0 ? 'HRB400E' : 'Q235B'
  }
  if (normalizedKey === 'spec') {
    return index % 2 === 0 ? '18' : '20'
  }
  if (normalizedKey === 'length') {
    return index % 2 === 0 ? '12m' : '9m'
  }
  if (normalizedKey.includes('quantityunit')) {
    return '支'
  }
  if (normalizedKey === 'unit') {
    return '吨'
  }
  if (normalizedKey.includes('batch')) {
    return `BATCH-20260426-${String(index + 1).padStart(2, '0')}`
  }
  if (normalizedKey.includes('settlement')) {
    return '理算'
  }
  if (normalizedKey.includes('status')) {
    return '草稿'
  }
  if (normalizedKey.includes('remark')) {
    return '此处为预览样例数据，保存后将按真实单据字段打印。'
  }
  if (normalizedKey.includes('tax')) {
    return '13%'
  }
  return `示例${index + 1}`
}

function sumBy(details: Array<Record<string, unknown>>, key: string) {
  return details.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

export function buildPrintTemplateTokenGroups(
  config: ModulePageConfig,
): PrintTemplateTokenGroup[] {
  const systemTokens: PrintTemplateTokenDescriptor[] = [
    {
      key: '_printDate',
      label: '打印日期',
      token: '{{_printDate}}',
      description: '当前打印日期，格式 YYYY-MM-DD',
    },
    {
      key: '_printTime',
      label: '打印时间',
      token: '{{_printTime}}',
      description: '当前打印时间，格式 YYYY-MM-DD HH:mm:ss',
    },
    {
      key: '_index',
      label: '明细序号',
      token: '{{_index}}',
      description: '在明细循环内表示从 1 开始的行号',
    },
  ]

  const headerTokens = config.detailFields.map((field) => ({
    key: field.key,
    label: field.label,
    token: `{{${field.key}}}`,
  }))

  const detailTokens = (config.itemColumns || []).map((column) => ({
    key: column.dataIndex,
    label: column.title,
    token: `{{detail.${column.dataIndex}}}`,
  }))

  return [
    {
      key: 'system',
      label: '系统变量',
      description: '打印时间和明细序号由系统自动注入。',
      tokens: systemTokens,
    },
    {
      key: 'header',
      label: '主表字段',
      description: '来自当前单据主表，可直接插入标题、摘要和页眉页脚。',
      tokens: headerTokens,
    },
    {
      key: 'detail',
      label: '明细字段',
      description: '必须放在明细循环块中使用。',
      tokens: detailTokens,
    },
  ]
}

export function buildPrintTemplateSnippets(
  config: ModulePageConfig,
): PrintTemplateSnippet[] {
  const firstHeaderField =
    config.detailFields[0]?.key || config.primaryNoKey || 'billNo'
  const firstDetailField = config.itemColumns?.[0]?.dataIndex || 'materialCode'

  return [
    {
      key: 'title',
      label: '标题行',
      description: '快速插入单据标题和打印时间。',
      content: `<div class="sheet-title">${config.title}：{{${firstHeaderField}}}</div>\n<div class="sheet-time">打印时间：{{_printTime}}</div>`,
    },
    {
      key: 'if',
      label: '条件块',
      description: '字段有值时才渲染内容。',
      content:
        '{{#if remark}}<div class="sheet-remark">备注：{{remark}}</div>{{/if}}',
    },
    {
      key: 'each',
      label: '循环块',
      description: '推荐的新明细循环写法。',
      content: `<tbody>\n{{#each details}}\n  <tr>\n    <td>{{_index}}</td>\n    <td>{{${firstDetailField}}}</td>\n  </tr>\n{{/each}}\n</tbody>`,
    },
    {
      key: 'legacy-detail',
      label: '兼容循环',
      description: '保留旧模板的注释式明细循环。',
      content: `<!--DETAIL_ROW_START-->\n<tr>\n  <td>{{_index}}</td>\n  <td>{{detail.${firstDetailField}}}</td>\n</tr>\n<!--DETAIL_ROW_END-->`,
    },
    {
      key: 'nested',
      label: '嵌套字段',
      description: '支持 customer.name 这类点路径。',
      content: '<div>业务员：{{meta.operatorName}}</div>',
    },
  ]
}

export function buildPrintTemplatePreviewData(
  config: ModulePageConfig,
): PrintTemplatePreviewData {
  const detailColumns = config.itemColumns || []
  const detailCount = detailColumns.length ? 3 : 0

  const details = Array.from({ length: detailCount }, (_, index) => {
    const item = detailColumns.reduce<Record<string, unknown>>(
      (row, column) => {
        row[column.dataIndex] = inferRowValue(
          column.dataIndex,
          column.type,
          index,
        )
        return row
      },
      {},
    )

    const unitPrice = Number(item.unitPrice || 1280 + index * 135.5)
    const quantity = Number(item.quantity || 18 + index * 6)
    const weightTon = Number(item.weightTon || 12.36 + index * 1.28)

    if (item.unitPrice == null) {
      item.unitPrice = unitPrice.toFixed(2)
    }
    if (item.quantity == null) {
      item.quantity = String(quantity)
    }
    if (item.weightTon == null) {
      item.weightTon = weightTon.toFixed(3)
    }
    if (item.amount == null) {
      item.amount = (unitPrice * weightTon).toFixed(2)
    }
    if (item.warehouseName != null) {
      item.warehouse = { name: item.warehouseName }
    }

    return {
      ...item,
      id: `preview-item-${index + 1}`,
    }
  })

  const totalWeight = sumBy(details, 'weightTon').toFixed(3)
  const totalAmount = sumBy(details, 'amount').toFixed(2)

  const model = config.detailFields.reduce<Record<string, unknown>>(
    (record, field, index) => {
      record[field.key] = inferRowValue(field.key, field.type, index)
      return record
    },
    {},
  )

  if (config.primaryNoKey) {
    model[config.primaryNoKey] =
      `${config.key.toUpperCase().replaceAll('-', '')}-20260426-001`
  }

  if ('totalWeight' in model) {
    model.totalWeight = totalWeight
  }
  if ('totalAmount' in model) {
    model.totalAmount = totalAmount
  }
  if ('supplierName' in model) {
    model.supplierName = sampleSuppliers[0]
  }
  if ('customerName' in model) {
    model.customerName = sampleCustomers[0]
  }
  if ('warehouseName' in model) {
    model.warehouseName = sampleWarehouses[0]
  }
  if ('projectName' in model) {
    model.projectName = sampleProjects[0]
  }
  if ('status' in model) {
    model.status = '草稿'
  }
  model.meta = {
    operatorName: '系统管理员',
    generatedFrom: '打印模板设计器',
  }

  return {
    model,
    details,
  }
}

export function buildPrintTemplateStarter(config: ModulePageConfig) {
  const summaryItems = config.detailFields
    .map(
      (field) => `
        <div class="sheet-summary-item">
          <span>${escapeHtml(field.label)}</span>
          <strong>{{${field.key}}}</strong>
        </div>`,
    )
    .join('')

  const detailHeader = (config.itemColumns || [])
    .map(
      (column) => `
            <th style="text-align:${inferAlign(column)};">${escapeHtml(column.title)}</th>`,
    )
    .join('')

  const detailBody = (config.itemColumns || [])
    .map(
      (column) => `
            <td style="text-align:${inferAlign(column)};">{{${column.dataIndex}}}</td>`,
    )
    .join('')

  const detailTable = config.itemColumns?.length
    ? `
      <table class="sheet-table">
        <thead>
          <tr>
            <th style="width: 56px; text-align:center;">序号</th>${detailHeader}
          </tr>
        </thead>
        <tbody>
{{#each details}}
          <tr>
            <td style="text-align:center;">{{_index}}</td>${detailBody}
          </tr>
{{/each}}
        </tbody>
      </table>`
    : '<div class="sheet-empty">当前单据没有明细表结构，可只使用主表字段排版。</div>'

  return `<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    color: #1f2329;
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    font-size: 12px;
    background: #fff;
  }
  .print-sheet {
    width: 100%;
    padding: 12px 16px 18px;
  }
  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 2px solid #1f2329;
  }
  .sheet-kicker {
    margin-bottom: 6px;
    color: #64748b;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .sheet-title {
    margin: 0;
    color: #0f172a;
    font-size: 28px;
    font-weight: 700;
  }
  .sheet-meta {
    min-width: 210px;
    color: #475569;
    font-size: 12px;
    line-height: 1.8;
    text-align: right;
  }
  .sheet-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
    margin-bottom: 18px;
  }
  @supports (display: grid) {
    .sheet-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .sheet-summary-item {
      flex: none;
    }
  }
  .sheet-summary-item {
    flex: 0 0 calc((100% - 20px) / 3);
    min-height: 78px;
    padding: 12px 14px;
    border: 1px solid #dbe4ee;
    border-radius: 10px;
    background: #f8fbff;
  }
  .sheet-summary-item span {
    display: block;
    margin-bottom: 8px;
    color: #64748b;
    font-size: 12px;
  }
  .sheet-summary-item strong {
    display: block;
    color: #0f172a;
    font-size: 15px;
    line-height: 1.45;
    word-break: break-all;
  }
  .sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .sheet-table th,
  .sheet-table td {
    border: 1px solid #111827;
    padding: 7px 8px;
    vertical-align: middle;
    word-break: break-all;
  }
  .sheet-table thead th {
    background: #eff4f9;
    font-weight: 700;
  }
  .sheet-table tr {
    page-break-inside: avoid;
  }
  .sheet-remark {
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px dashed #94a3b8;
    border-radius: 10px;
    background: #f8fafc;
    line-height: 1.7;
  }
  .sheet-remark-label {
    margin-bottom: 6px;
    color: #475569;
    font-weight: 600;
  }
  .sheet-empty {
    padding: 24px;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    color: #64748b;
    text-align: center;
    background: #f8fafc;
  }
  .sheet-footer {
    margin-top: 14px;
    color: #64748b;
    font-size: 11px;
    text-align: right;
  }
</style>
<div class="print-sheet">
  <div class="sheet-header">
    <div>
      <div class="sheet-kicker">${escapeHtml(config.kicker)}</div>
      <h1 class="sheet-title">${escapeHtml(config.title)}打印单</h1>
    </div>
    <div class="sheet-meta">
      <div>打印日期：{{_printDate}}</div>
      <div>打印时间：{{_printTime}}</div>
    </div>
  </div>

  <div class="sheet-summary">
    ${summaryItems}
  </div>

  ${detailTable}

  {{#if remark}}
  <div class="sheet-remark">
    <div class="sheet-remark-label">备注</div>
    <div>{{remark}}</div>
  </div>
  {{/if}}

  <div class="sheet-footer">模板适用页面：${escapeHtml(config.title)}</div>
</div>`
}
