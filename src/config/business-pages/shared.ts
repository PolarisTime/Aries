import type {
  ModuleColumnDefinition,
  ModuleLineItem,
  ModuleOverviewItem,
  ModuleRecord,
  ModuleStatusMeta,
} from '@/types/module-page'

export function formatInteger(value: number) {
  return String(value)
}

export function formatAmount(value: number) {
  return value.toFixed(2)
}

export function formatWeight(value: number) {
  return value.toFixed(3)
}

export function sumBy(rows: ModuleRecord[], key: string) {
  return rows.reduce((sum, row) => sum + Number(row[key] || 0), 0)
}

export function buildAmountWeightOverview(
  rows: ModuleRecord[],
  amountKey: string,
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: '记录数', value: formatInteger(rows.length) },
    { label: '吨位合计', value: formatWeight(sumBy(rows, weightKey)) },
    { label: '金额合计', value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildWeightOverview(
  rows: ModuleRecord[],
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: '记录数', value: formatInteger(rows.length) },
    { label: '吨位合计', value: formatWeight(sumBy(rows, weightKey)) },
  ]
}

export function buildStatementOverview(
  rows: ModuleRecord[],
  businessKey: string,
  paidKey: string,
  balanceKey: string,
): ModuleOverviewItem[] {
  return [
    { label: '对账单数', value: formatInteger(rows.length) },
    { label: '本期金额', value: formatAmount(sumBy(rows, businessKey)) },
    { label: '已结金额', value: formatAmount(sumBy(rows, paidKey)) },
    { label: '余额', value: formatAmount(sumBy(rows, balanceKey)) },
  ]
}

export function buildFinanceOverview(
  rows: ModuleRecord[],
  amountKey: string,
): ModuleOverviewItem[] {
  return [
    { label: '单据数', value: formatInteger(rows.length) },
    { label: '金额合计', value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildMasterOverview(
  rows: ModuleRecord[],
  activeKey = 'status',
  activeValue = '正常',
): ModuleOverviewItem[] {
  return [
    { label: '主数据数', value: formatInteger(rows.length) },
    { label: '正常数', value: formatInteger(rows.filter((row) => row[activeKey] === activeValue).length) },
  ]
}

const materialInfoColumns: ModuleColumnDefinition[] = [
  { title: '商品编码', dataIndex: 'materialCode', width: 140, required: true },
  { title: '品牌', dataIndex: 'brand', width: 110, required: true },
  { title: '类别', dataIndex: 'category', width: 100, required: true },
  { title: '材质', dataIndex: 'material', width: 120, required: true },
  { title: '规格', dataIndex: 'spec', width: 100, required: true },
  { title: '长度', dataIndex: 'length', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 80, required: true },
  { title: '件重/吨', dataIndex: 'pieceWeightTon', width: 110, align: 'right', type: 'weight', required: true },
  { title: '每件支数', dataIndex: 'piecesPerBundle', width: 110, align: 'right', type: 'count' },
]

const orderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '数量', dataIndex: 'quantity', width: 100, align: 'right', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
  ...materialInfoColumns.slice(7),
  { title: '吨位', dataIndex: 'weightTon', width: 100, align: 'right', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 110, align: 'right', type: 'amount', required: true },
]

const batchOrderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '批号', dataIndex: 'batchNo', width: 120 },
  { title: '数量', dataIndex: 'quantity', width: 100, align: 'right', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
  ...materialInfoColumns.slice(7),
  { title: '吨位', dataIndex: 'weightTon', width: 100, align: 'right', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 110, align: 'right', type: 'amount', required: true },
]

const purchaseItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '码头', dataIndex: 'warehouseName', width: 120, required: true },
  { title: '批号', dataIndex: 'batchNo', width: 120 },
  { title: '数量', dataIndex: 'quantity', width: 100, align: 'right', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
  ...materialInfoColumns.slice(7),
  { title: '吨位', dataIndex: 'weightTon', width: 100, align: 'right', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 110, align: 'right', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 110, align: 'right', type: 'amount', required: true },
]

function applyCompactItemLayout(
  columns: ModuleColumnDefinition[],
  widthMap: Record<string, number>,
  hiddenKeys: string[] = [],
) {
  const hiddenKeySet = new Set(hiddenKeys)
  return columns
    .filter((column) => !hiddenKeySet.has(column.dataIndex))
    .map((column) => (widthMap[column.dataIndex] ? { ...column, width: widthMap[column.dataIndex] } : column))
}

const compactTradeItemWidthMap: Record<string, number> = {
  sourceNo: 160,
  materialCode: 170,
  brand: 80,
  category: 64,
  material: 96,
  spec: 80,
  length: 80,
  unit: 80,
  warehouseName: 110,
  quantity: 80,
  quantityUnit: 90,
  batchNo: 120,
  pieceWeightTon: 80,
  weightTon: 96,
  unitPrice: 96,
  amount: 96,
}

const compactFreightItemWidthMap: Record<string, number> = {
  sourceNo: 160,
  customerName: 120,
  projectName: 160,
  materialCode: 170,
  materialName: 120,
  brand: 80,
  category: 64,
  material: 96,
  spec: 80,
  length: 80,
  quantity: 80,
  quantityUnit: 90,
  pieceWeightTon: 80,
  weightTon: 96,
  warehouseName: 96,
  batchNo: 120,
}

export const compactOrderItemColumns = applyCompactItemLayout(
  orderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchOrderItemColumns = applyCompactItemLayout(
  batchOrderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactWeightOnlyBatchOrderItemColumns = applyCompactItemLayout(
  batchOrderItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle', 'unitPrice', 'amount'],
)

export const compactPurchaseItemColumns = applyCompactItemLayout(
  purchaseItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactWeightOnlyPurchaseItemColumns = applyCompactItemLayout(
  purchaseItemColumns,
  compactTradeItemWidthMap,
  ['piecesPerBundle', 'unitPrice', 'amount'],
)

export const compactCustomerStatementItemColumns = applyCompactItemLayout(
  [
    { title: '订单号', dataIndex: 'sourceNo', width: 160 },
    ...orderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchCustomerStatementItemColumns = applyCompactItemLayout(
  [
    { title: '订单号', dataIndex: 'sourceNo', width: 160 },
    ...batchOrderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactSupplierStatementItemColumns = applyCompactItemLayout(
  [
    { title: '入库单号', dataIndex: 'sourceNo', width: 160 },
    ...orderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchSupplierStatementItemColumns = applyCompactItemLayout(
  [
    { title: '入库单号', dataIndex: 'sourceNo', width: 160 },
    ...batchOrderItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceReceiptItemColumns = applyCompactItemLayout(
  [
    { title: '采购订单号', dataIndex: 'sourceNo', width: 160 },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactInvoiceIssueItemColumns = applyCompactItemLayout(
  [
    { title: '销售订单号', dataIndex: 'sourceNo', width: 160 },
    ...purchaseItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const freightItemColumns: ModuleColumnDefinition[] = [
  { title: '出库单号', dataIndex: 'sourceNo', width: 160 },
  { title: '客户', dataIndex: 'customerName', width: 140 },
  { title: '项目', dataIndex: 'projectName', width: 180 },
  { title: '商品编码', dataIndex: 'materialCode', width: 140 },
  { title: '商品名称', dataIndex: 'materialName', width: 140 },
  { title: '品牌', dataIndex: 'brand', width: 110 },
  { title: '类别', dataIndex: 'category', width: 100 },
  { title: '材质', dataIndex: 'material', width: 120 },
  { title: '规格', dataIndex: 'spec', width: 100 },
  { title: '长度', dataIndex: 'length', width: 100 },
  { title: '数量', dataIndex: 'quantity', width: 100, align: 'right', type: 'count' },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 90 },
  { title: '件重/吨', dataIndex: 'pieceWeightTon', width: 110, align: 'right', type: 'weight' },
  { title: '每件支数', dataIndex: 'piecesPerBundle', width: 110, align: 'right', type: 'count' },
  { title: '批号', dataIndex: 'batchNo', width: 140 },
  { title: '吨位', dataIndex: 'weightTon', width: 100, align: 'right', type: 'weight' },
  { title: '仓库', dataIndex: 'warehouseName', width: 120 },
]

export const compactFreightItemColumns = applyCompactItemLayout(
  freightItemColumns,
  compactFreightItemWidthMap,
  ['piecesPerBundle'],
)

export const statusMap: Record<string, ModuleStatusMeta> = {
  草稿: { text: '草稿', color: 'default' },
  完成采购: { text: '完成采购', color: 'success' },
  完成入库: { text: '完成入库', color: 'success' },
  完成销售: { text: '完成销售', color: 'success' },
  待核准: { text: '待核准', color: 'warning' },
  已核准: { text: '已核准', color: 'success' },
  未审核: { text: '未审核', color: 'warning' },
  已审核: { text: '已审核', color: 'success' },
  部分入库: { text: '部分入库', color: 'processing' },
  部分出库: { text: '部分出库', color: 'processing' },
  已完成: { text: '已完成', color: 'success' },
  已送达: { text: '已送达', color: 'success' },
  未送达: { text: '未送达', color: 'default' },
  待确认: { text: '待确认', color: 'warning' },
  已确认: { text: '已确认', color: 'success' },
  待审核: { text: '待审核', color: 'warning' },
  已签署: { text: '已签署', color: 'success' },
  未签署: { text: '未签署', color: 'default' },
  已收款: { text: '已收款', color: 'success' },
  已付款: { text: '已付款', color: 'success' },
  已收票: { text: '已收票', color: 'success' },
  已开票: { text: '已开票', color: 'success' },
  未收票: { text: '未收票', color: 'warning' },
  部分结清: { text: '部分结清', color: 'processing' },
  执行中: { text: '执行中', color: 'processing' },
  已归档: { text: '已归档', color: 'success' },
  正常: { text: '正常', color: 'success' },
  禁用: { text: '禁用', color: 'warning' },
  成功: { text: '成功', color: 'success' },
  失败: { text: '失败', color: 'error' },
}

export const actionSet = [
  { label: '新增', type: 'primary' as const },
  { label: '导出', type: 'default' as const },
]

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildLineItemId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index + 1}`
}

export function cloneLineItems(items: unknown, prefix: string): ModuleLineItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return cloneRecord(items).map((item: ModuleLineItem, index: number) => ({
    ...item,
    id: buildLineItemId(prefix, index),
  }))
}

export function transformFreightItems(parentRecord: ModuleRecord): ModuleLineItem[] {
  return cloneLineItems(parentRecord.items, 'freight-item').map((item, index) => ({
    id: item.id || buildLineItemId('freight-item', index),
    sourceNo: parentRecord.outboundNo || '',
    customerName: parentRecord.customerName || '',
    projectName: parentRecord.projectName || '',
    materialCode: item.materialCode || '',
    materialName: item.materialName || '',
    brand: item.brand || '',
    category: item.category || '',
    material: item.material || '',
    spec: item.spec || '',
    length: item.length || '',
    pieceWeightTon: item.pieceWeightTon || 0,
    piecesPerBundle: item.piecesPerBundle || 0,
    batchNo: item.batchNo || '',
    quantity: item.quantity || 0,
    quantityUnit: item.quantityUnit || '件',
    weightTon: item.weightTon || 0,
    warehouseName: item.warehouseName || parentRecord.warehouseName || '',
  }))
}
