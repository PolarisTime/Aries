import i18next from 'i18next'
import type { ModuleColumnDefinition } from '@/types/module-page'
import { applyCompactItemLayout } from './shared-item-column-utils'

const compactFreightItemWidthMap: Record<string, number> = {
  sourceNo: 140,
  customerName: 136,
  projectName: 156,
  materialCode: 240,
  materialName: 156,
  brand: 92,
  category: 84,
  material: 92,
  spec: 128,
  length: 64,
  quantity: 70,
  quantityUnit: 64,
  pieceWeightTon: 90,
  weightTon: 108,
  warehouseName: 132,
  batchNo: 120,
}

export const freightItemColumns: ModuleColumnDefinition[] = [
  { title: i18next.t('modules.columns.outboundNo'), dataIndex: 'sourceNo', width: 140 },
  { title: i18next.t('modules.columns.materialCode'), dataIndex: 'materialCode', width: 148 },
  { title: i18next.t('modules.columns.materialName'), dataIndex: 'materialName', width: 156 },
  { title: i18next.t('modules.columns.spec'), dataIndex: 'spec', width: 128 },
  { title: i18next.t('modules.columns.material'), dataIndex: 'material', width: 92 },
  { title: i18next.t('modules.columns.customerName'), dataIndex: 'customerName', width: 136 },
  { title: i18next.t('modules.columns.projectName'), dataIndex: 'projectName', width: 156 },
  { title: i18next.t('modules.columns.brand'), dataIndex: 'brand', width: 92 },
  { title: i18next.t('modules.columns.category'), dataIndex: 'category', width: 84 },
  { title: i18next.t('modules.columns.length'), dataIndex: 'length', width: 70 },
  {
    title: i18next.t('modules.columns.quantity'),
    dataIndex: 'quantity',
    width: 76,
    align: 'center',
    type: 'count',
  },
  { title: i18next.t('modules.columns.quantityUnit'), dataIndex: 'quantityUnit', width: 64, align: 'center' },
  {
    title: i18next.t('modules.columns.pieceWeightTon'),
    dataIndex: 'pieceWeightTon',
    width: 90,
    align: 'center',
    type: 'weight',
  },
  {
    title: i18next.t('modules.columns.piecesPerBundle'),
    dataIndex: 'piecesPerBundle',
    width: 76,
    align: 'center',
    type: 'count',
  },
  { title: i18next.t('modules.columns.batchNo'), dataIndex: 'batchNo', width: 130 },
  {
    title: i18next.t('modules.columns.weightTon'),
    dataIndex: 'weightTon',
    width: 108,
    align: 'center',
    type: 'weight',
  },
  { title: i18next.t('modules.columns.warehouse'), dataIndex: 'warehouseName', width: 132 },
]

export const compactFreightItemColumns = applyCompactItemLayout(
  freightItemColumns,
  compactFreightItemWidthMap,
  ['projectName', 'brand', 'category', 'piecesPerBundle', 'batchNo'],
)
