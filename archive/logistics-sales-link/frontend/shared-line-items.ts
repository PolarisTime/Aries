import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { asString } from '@/utils/type-narrowing'

export { cloneLineItems }

export function transformFreightItems(
  parentRecord: ModuleRecord,
): ModuleLineItem[] {
  const sourceItems = cloneLineItems(parentRecord.items)
  return cloneLineItems(parentRecord.items, 'freight-item').map(
    (item, index) => {
      const itemWarehouseId = asString(item.warehouseId).trim()
      const itemWarehouseName = asString(item.warehouseName).trim()
      const inheritsParentWarehouse = !itemWarehouseId && !itemWarehouseName

      return {
        id: item.id,
        sourceNo: parentRecord.outboundNo || '',
        sourceSalesOutboundItemId: sourceItems[index]?.id,
        settlementCompanyId: item.settlementCompanyId,
        settlementCompanyName: item.settlementCompanyName,
        customerName: parentRecord.customerName || '',
        projectName: parentRecord.projectName || '',
        materialId: item.materialId,
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
        warehouseId: itemWarehouseId
          ? item.warehouseId
          : inheritsParentWarehouse
            ? parentRecord.warehouseId
            : undefined,
        warehouseName: itemWarehouseName
          ? itemWarehouseName
          : inheritsParentWarehouse
            ? parentRecord.warehouseName || ''
            : '',
      }
    },
  )
}

function resolveFreightMaterialName(item: ModuleLineItem) {
  const explicitName = asString(item.materialName).trim()
  if (explicitName) {
    return explicitName
  }
  return asString(item.brand).trim()
}
