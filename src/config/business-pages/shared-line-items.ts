import { asString } from '@/utils/type-narrowing'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

function cloneRecord<T>(value: T): T {
  return structuredClone(value)
}

function buildLineItemId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index + 1}`
}

export function cloneLineItems(
  items: unknown,
  prefix: string,
): ModuleLineItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  return cloneRecord(items).map((item: ModuleLineItem, index: number) => ({
    ...item,
    id: buildLineItemId(prefix, index),
  }))
}

export function transformFreightItems(
  parentRecord: ModuleRecord,
): ModuleLineItem[] {
  return cloneLineItems(parentRecord.items, 'freight-item').map(
    (item, index) => ({
      id: item.id || buildLineItemId('freight-item', index),
      sourceNo: parentRecord.outboundNo || '',
      customerName: parentRecord.customerName || '',
      projectName: parentRecord.projectName || '',
      materialCode: item.materialCode || '',
      materialName: resolveFreightMaterialName(item),
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
    }),
  )
}

function resolveFreightMaterialName(item: ModuleLineItem) {
  const explicitName = asString(item.materialName).trim()
  if (explicitName) {
    return explicitName
  }
  return asString(item.brand).trim()
}
