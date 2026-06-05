import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { asString } from '@/utils/type-narrowing'

export { cloneLineItems }

export function transformFreightItems(
  parentRecord: ModuleRecord,
): ModuleLineItem[] {
  return cloneLineItems(parentRecord.items, 'freight-item').map(
    (item, index) => ({
      id: item.id || `freight-item-${Date.now()}-${index + 1}`,
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
