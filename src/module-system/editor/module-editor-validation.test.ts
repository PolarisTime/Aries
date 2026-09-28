import { describe, expect, it } from 'vitest'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import { removeEditorLineItems } from '@/module-system/editor/module-editor-line-item-removal'
import { getEditorValidationMessage } from '@/module-system/editor/module-editor-validation'
import type { ModuleLineItem } from '@/types/module-page'

const salesItemColumns = salesOrdersPageConfig.itemColumns ?? []

/** 模拟「导入采购订单明细」生成的销售订单行：来源采购入库明细 + 已分配件数上限。 */
function importedSalesItem(
  id: string,
  sourceInboundItemId: string,
  quantity: number,
  maxImportQuantity = quantity,
): ModuleLineItem {
  return {
    id,
    lineNo: Number(id),
    sourceInboundItemId,
    sourcePurchaseOrderItemId: undefined,
    warehouseName: '东恒库',
    brand: '中天',
    category: '直条',
    material: 'HRB400',
    spec: '10',
    length: '9米',
    unit: '吨',
    quantity,
    quantityUnit: '件',
    pieceWeightTon: 1.999,
    weightTon: Number((quantity * 1.999).toFixed(3)),
    unitPrice: 100,
    amount: Number((quantity * 1.999 * 100).toFixed(2)),
    _maxImportQuantity: maxImportQuantity,
  }
}

function validateSalesItems(items: ModuleLineItem[]) {
  return getEditorValidationMessage({
    moduleKey: 'sales-order',
    fields: [],
    editorForm: {},
    hasItemColumns: true,
    itemColumns: salesItemColumns,
    items,
    itemCount: items.length,
    collectAll: true,
  })
}

describe('getEditorValidationMessage 销售订单导入明细', () => {
  it('导入上游后的明细通过校验（来源关联与件数合法）', () => {
    expect(
      validateSalesItems([
        importedSalesItem('1', 'IN-1', 5, 5),
        importedSalesItem('2', 'IN-2', 3, 3),
      ]),
    ).toBeNull()
  })

  it('删除一行后剩余明细仍通过校验，不要求被删行关联采购来源', () => {
    const imported = [
      importedSalesItem('1', 'IN-1', 5, 5),
      importedSalesItem('2', 'IN-2', 3, 3),
    ]
    const remaining = removeEditorLineItems(imported, ['1'])
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.sourceInboundItemId).toBe('IN-2')
    expect(validateSalesItems(remaining)).toBeNull()
  })

  it('导入行被全部删除后提示至少一条明细（必须重新导入采购来源）', () => {
    const remaining = removeEditorLineItems(
      [importedSalesItem('1', 'IN-1', 5, 5)],
      ['1'],
    )
    expect(remaining).toHaveLength(0)
    expect(validateSalesItems(remaining)).toContain('请至少填写一条明细')
  })

  it('件数超过来源可关联上限时给出原文提示', () => {
    expect(
      validateSalesItems([importedSalesItem('1', 'IN-1', 6, 5)]),
    ).toContain('第1行可关联数量不能超过5件')
  })
})
