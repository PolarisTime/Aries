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
    { label: '总重量合计（吨）', value: formatWeight(sumBy(rows, weightKey)) },
    { label: '金额合计', value: formatAmount(sumBy(rows, amountKey)) },
  ]
}

export function buildWeightOverview(
  rows: ModuleRecord[],
  weightKey = 'totalWeight',
): ModuleOverviewItem[] {
  return [
    { label: '记录数', value: formatInteger(rows.length) },
    { label: '总重量合计（吨）', value: formatWeight(sumBy(rows, weightKey)) },
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
  { title: '商品编码', dataIndex: 'materialCode', width: 128, required: true, align: 'center' },
  { title: '品牌', dataIndex: 'brand', width: 86, required: true, align: 'center' },
  { title: '类别', dataIndex: 'category', width: 72, required: true, align: 'center' },
  { title: '材质', dataIndex: 'material', width: 82, required: true, align: 'center' },
  { title: '规格', dataIndex: 'spec', width: 78, required: true, align: 'center' },
  { title: '长度', dataIndex: 'length', width: 70, align: 'center' },
  { title: '单位', dataIndex: 'unit', width: 58, required: true, align: 'center' },
  { title: '件重/吨', dataIndex: 'pieceWeightTon', width: 82, align: 'center', type: 'weight', required: true },
  { title: '每件支数', dataIndex: 'piecesPerBundle', width: 76, align: 'center', type: 'count' },
]

const orderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '数量', dataIndex: 'quantity', width: 76, align: 'center', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  { title: '总重量（吨）', dataIndex: 'weightTon', width: 108, align: 'center', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 88, align: 'center', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 92, align: 'center', type: 'amount', required: true },
]

const batchOrderItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  { title: '数量', dataIndex: 'quantity', width: 76, align: 'center', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  { title: '总重量（吨）', dataIndex: 'weightTon', width: 108, align: 'center', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 88, align: 'center', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 92, align: 'center', type: 'amount', required: true },
]

const purchaseItemColumns: ModuleColumnDefinition[] = [
  ...materialInfoColumns.slice(0, 7),
  { title: '码头', dataIndex: 'warehouseName', width: 96, required: true },
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  { title: '数量', dataIndex: 'quantity', width: 76, align: 'center', type: 'count', required: true },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  ...materialInfoColumns.slice(7),
  { title: '总重量（吨）', dataIndex: 'weightTon', width: 108, align: 'center', type: 'weight', required: true },
  { title: '单价', dataIndex: 'unitPrice', width: 88, align: 'center', type: 'amount', required: true },
  { title: '金额', dataIndex: 'amount', width: 92, align: 'center', type: 'amount', required: true },
]

const purchaseWeighColumns: ModuleColumnDefinition[] = [
  { title: '过磅重量', dataIndex: 'weighWeightTon', width: 88, align: 'center', type: 'weight' },
  { title: '差额重量（吨）', dataIndex: 'weightAdjustmentTon', width: 106, align: 'center', type: 'weight' },
  { title: '差额金额', dataIndex: 'weightAdjustmentAmount', width: 92, align: 'center', type: 'amount' },
]

const purchaseInboundSettlementColumns: ModuleColumnDefinition[] = [
  { title: '结算方式', dataIndex: 'settlementMode', width: 76, align: 'center', required: true },
  ...purchaseWeighColumns,
]

function insertColumnsAfter(
  columns: ModuleColumnDefinition[],
  dataIndex: string,
  insertedColumns: ModuleColumnDefinition[],
) {
  const index = columns.findIndex((column) => column.dataIndex === dataIndex)
  if (index < 0) {
    return [...columns, ...insertedColumns]
  }
  return [
    ...columns.slice(0, index + 1),
    ...insertedColumns,
    ...columns.slice(index + 1),
  ]
}

const purchaseInboundItemColumns = insertColumnsAfter(purchaseItemColumns, 'weightTon', purchaseInboundSettlementColumns)
const supplierStatementItemColumns = insertColumnsAfter(orderItemColumns, 'weightTon', purchaseWeighColumns)
const batchSupplierStatementItemColumns = insertColumnsAfter(batchOrderItemColumns, 'weightTon', purchaseWeighColumns)

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
  sourceNo: 140,
  materialCode: 136,
  brand: 68,
  category: 58,
  material: 76,
  spec: 72,
  length: 64,
  unit: 56,
  warehouseName: 88,
  quantity: 70,
  quantityUnit: 64,
  batchNo: 96,
  pieceWeightTon: 76,
  weightTon: 108,
  settlementMode: 76,
  weighWeightTon: 86,
  weightAdjustmentTon: 106,
  weightAdjustmentAmount: 90,
  unitPrice: 86,
  amount: 90,
}

const compactFreightItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  customerName: 104,
  projectName: 130,
  materialCode: 136,
  materialName: 104,
  brand: 68,
  category: 58,
  material: 76,
  spec: 72,
  length: 64,
  quantity: 70,
  quantityUnit: 64,
  pieceWeightTon: 76,
  weightTon: 108,
  warehouseName: 88,
  batchNo: 96,
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

export const compactPurchaseInboundItemColumns = applyCompactItemLayout(
  purchaseInboundItemColumns,
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
    ...supplierStatementItemColumns,
  ],
  compactTradeItemWidthMap,
  ['piecesPerBundle'],
)

export const compactBatchSupplierStatementItemColumns = applyCompactItemLayout(
  [
    { title: '入库单号', dataIndex: 'sourceNo', width: 160 },
    ...batchSupplierStatementItemColumns,
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
  { title: '出库单号', dataIndex: 'sourceNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 104 },
  { title: '项目', dataIndex: 'projectName', width: 130 },
  { title: '商品编码', dataIndex: 'materialCode', width: 128 },
  { title: '商品名称', dataIndex: 'materialName', width: 104 },
  { title: '品牌', dataIndex: 'brand', width: 86 },
  { title: '类别', dataIndex: 'category', width: 72 },
  { title: '材质', dataIndex: 'material', width: 82 },
  { title: '规格', dataIndex: 'spec', width: 78 },
  { title: '长度', dataIndex: 'length', width: 70 },
  { title: '数量', dataIndex: 'quantity', width: 76, align: 'center', type: 'count' },
  { title: '数量单位', dataIndex: 'quantityUnit', width: 64, align: 'center' },
  { title: '件重/吨', dataIndex: 'pieceWeightTon', width: 82, align: 'center', type: 'weight' },
  { title: '每件支数', dataIndex: 'piecesPerBundle', width: 76, align: 'center', type: 'count' },
  { title: '批号', dataIndex: 'batchNo', width: 100 },
  { title: '总重量（吨）', dataIndex: 'weightTon', width: 108, align: 'center', type: 'weight' },
  { title: '仓库', dataIndex: 'warehouseName', width: 96 },
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
