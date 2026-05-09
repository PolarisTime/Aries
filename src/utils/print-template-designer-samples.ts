import type {
  ModuleColumnDefinition,
  ModuleDetailField,
} from '@/types/module-page'

const sampleDates = ['2026-04-26', '2026-04-27', '2026-04-28']
const sampleWarehouses = ['一号仓', '二号仓', '三号仓']
const sampleCustomers = ['华东建设集团', '申桥钢构工程', '远海供应链']
const sampleSuppliers = ['宝钢资源', '日照钢铁', '山钢供应链']
const sampleProjects = ['虹桥枢纽项目', '浦东厂房项目', '嘉兴码头项目']

export function escapePrintTemplateHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function inferPrintTemplateAlign(column: ModuleColumnDefinition) {
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

export function inferPrintTemplateRowValue(
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

export function getPrintTemplateSampleSuppliers() {
  return sampleSuppliers
}

export function getPrintTemplateSampleCustomers() {
  return sampleCustomers
}

export function getPrintTemplateSampleWarehouses() {
  return sampleWarehouses
}

export function getPrintTemplateSampleProjects() {
  return sampleProjects
}
