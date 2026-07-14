import { describe, expect, it, vi } from 'vitest'
import { getEditorValidationMessage } from './module-editor-validation'

vi.mock('@/constants/module-options', () => ({
  isPurchaseWeighRequiredCategory: (cat: string) => cat === '钢坯',
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
  t: (key: string) => key,
}))

describe('getEditorValidationMessage', () => {
  const baseOptions = {
    fields: [],
    editorForm: { id: '' },
    hasItemColumns: false,
    itemColumns: [],
    items: [],
    itemCount: 0,
    skipRequiredFieldKeys: [],
    occupiedParentMap: {},
    getPrimaryNo: (r: any) => String(r.id),
  }

  it('returns null when no validation errors', () => {
    expect(getEditorValidationMessage(baseOptions)).toBeNull()
  })

  it('returns field required error for missing required field', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [{ key: 'name', label: '名称', required: true }] as any,
    })
    expect(result).toBe('modules.validation.fieldRequired')
  })

  it('skips fields in skipRequiredFieldKeys', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [{ key: 'name', label: '名称', required: true }] as any,
      skipRequiredFieldKeys: ['name'],
    })
    expect(result).toBeNull()
  })

  it('allows required fields with editor values', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [{ key: 'name', label: '名称', required: true }] as any,
      editorForm: { id: '', name: '模块名称' },
    })
    expect(result).toBeNull()
  })

  it('skips required validation for fields hidden by current form values', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [
        {
          key: 'sourceStatementId',
          label: '关联对账单',
          required: true,
          visibleWhen: (form?: Record<string, unknown>) =>
            form?.paymentPurpose === 'STATEMENT_SETTLEMENT',
        },
      ] as any,
      editorForm: {
        id: '',
        paymentPurpose: 'PURCHASE_PREPAYMENT',
      },
    })

    expect(result).toBeNull()
  })

  it('returns minOneItem when hasItemColumns and itemCount is 0', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      hasItemColumns: true,
    })
    expect(result).toBe('modules.validation.minOneItem')
  })

  it('collects all errors when collectAll is true', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [
        { key: 'name', label: '名称', required: true },
        { key: 'code', label: '编码', required: true },
      ] as any,
      hasItemColumns: true,
      collectAll: true,
    })
    expect(result).toContain('modules.validation.fieldRequired')
    expect(result).toContain('modules.validation.minOneItem')
  })

  it('validates parent relation occupancy', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
        enforceUniqueRelation: true,
      } as any,
      editorForm: { id: '', sourceOrderNos: 'SO001' },
      occupiedParentMap: { SO001: { id: 'existing' } },
      getPrimaryNo: (r: any) => r.id,
    })
    expect(result).toContain('modules.validation.parentRelationOccupied')
  })

  it('collects parent relation errors when collectAll is true', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
        enforceUniqueRelation: true,
      } as any,
      editorForm: { id: '', sourceOrderNos: 'SO001' },
      occupiedParentMap: { SO001: { id: 'existing' } },
      getPrimaryNo: (r: any) => r.id,
      collectAll: true,
    })
    expect(result).toContain('modules.validation.parentRelationOccupied')
  })

  it('allows unoccupied parent relations', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      parentImportConfig: {
        parentModuleKey: 'sales-order',
        label: '销售订单',
        parentFieldKey: 'sourceOrderNos',
        parentDisplayFieldKey: 'orderNo',
        enforceUniqueRelation: true,
      } as any,
      editorForm: { id: '', sourceOrderNos: 'SO002' },
      occupiedParentMap: { SO001: { id: 'existing' } },
      getPrimaryNo: (r: any) => r.id,
    })
    expect(result).toBeNull()
  })

  it('limits errors to 5 when collectAll', () => {
    const result = getEditorValidationMessage({
      ...baseOptions,
      fields: [
        { key: 'a', label: 'A', required: true },
        { key: 'b', label: 'B', required: true },
        { key: 'c', label: 'C', required: true },
        { key: 'd', label: 'D', required: true },
        { key: 'e', label: 'E', required: true },
        { key: 'f', label: 'F', required: true },
      ] as any,
      collectAll: true,
    })
    expect(result).toContain('modules.validation.errorSummarySuffix')
  })

  describe('line item validation', () => {
    it('validates maxImportQuantity', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', _maxImportQuantity: 5, quantity: 10 }] as any,
        itemColumns: [] as any,
      })
      expect(result).toContain('modules.validation.maxImportExceeded')
    })

    it('returns first line item error by default', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', _maxImportQuantity: 5, quantity: 10 }] as any,
        itemColumns: [] as any,
      })
      expect(result).toBe('modules.validation.maxImportExceeded')
    })

    it('allows quantities below maxImportQuantity', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', _maxImportQuantity: 5, quantity: 3 }] as any,
        itemColumns: [] as any,
      })
      expect(result).toBeNull()
    })

    it('treats missing quantity as zero for maxImportQuantity', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', _maxImportQuantity: 5 }] as any,
        itemColumns: [] as any,
      })
      expect(result).toBeNull()
    })

    it('requires weigh settlement for certain categories on purchase-inbound', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'purchase-inbound',
        hasItemColumns: true,
        itemCount: 1,
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '101',
            warehouseId: '201',
            quantity: 1,
            category: '钢坯',
            settlementMode: '理算',
          },
        ] as any,
        itemColumns: [] as any,
      })
      expect(result).toContain('modules.validation.weighRequired')
    })

    it('requires weighWeightTon for weigh settlement on purchase-inbound', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'purchase-inbound',
        hasItemColumns: true,
        itemCount: 1,
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '101',
            warehouseId: '201',
            quantity: 1,
            category: '钢坯',
            settlementMode: '过磅',
            weighWeightTon: undefined,
          },
        ] as any,
        itemColumns: [] as any,
      })
      expect(result).toContain('modules.validation.weighWeightRequired')
    })

    it('rejects purchase inbound weigh weight lower than locked sales weight', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'purchase-inbound',
        hasItemColumns: true,
        itemCount: 1,
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '101',
            warehouseId: '201',
            quantity: 1,
            category: '钢坯',
            settlementMode: '过磅',
            weighWeightTon: 1,
            _lockedSalesWeightTon: 2,
          },
        ] as any,
        itemColumns: [] as any,
      })
      expect(result).toContain('modules.validation.lockedSalesWeightExceeded')
    })

    it('requires required columns', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', materialCode: '' }] as any,
        itemColumns: [
          { dataIndex: 'materialCode', title: '材质编码', required: true },
        ] as any,
      })
      expect(result).toContain('modules.validation.lineItemRequired')
    })

    it('returns null when line items are valid without moduleKey', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', materialCode: 'M001', quantity: 10 }] as any,
        itemColumns: [
          { dataIndex: 'materialCode', title: '材质编码', required: true },
        ] as any,
      })
      expect(result).toBeNull()
    })

    it('skips weigh validation for non-purchase-inbound modules', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'sales-order',
        hasItemColumns: true,
        itemCount: 1,
        items: [{ id: '1', category: '钢坯', settlementMode: '理算' }] as any,
        itemColumns: [] as any,
      })
      expect(result).toBeNull()
    })

    it('returns null when purchase-inbound has valid weigh settlement', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'purchase-inbound',
        hasItemColumns: true,
        itemCount: 1,
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '101',
            warehouseId: '201',
            quantity: 1,
            category: '钢坯',
            settlementMode: '过磅',
            weighWeightTon: 50,
          },
        ] as any,
        itemColumns: [] as any,
      })
      expect(result).toBeNull()
    })

    it('rejects mixed purchase inbound sources, warehouses and settlement modes', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        moduleKey: 'purchase-inbound',
        hasItemColumns: true,
        itemCount: 2,
        items: [
          {
            id: '1',
            sourcePurchaseOrderItemId: '101',
            warehouseId: '201',
            quantity: 1,
            category: '螺纹钢',
            settlementMode: '理算',
            _parentRelationId: '301',
          },
          {
            id: '2',
            sourcePurchaseOrderItemId: '102',
            warehouseId: '202',
            quantity: 1,
            category: '钢坯',
            settlementMode: '过磅',
            weighWeightTon: 1,
            _parentRelationId: '302',
          },
        ] as any,
        itemColumns: [] as any,
        collectAll: true,
      })

      expect(result).toContain(
        'modules.validation.purchaseInboundMixedWarehouse',
      )
      expect(result).toContain(
        'modules.validation.purchaseInboundMixedSettlementMode',
      )
      expect(result).toContain('modules.validation.purchaseInboundMixedSource')
    })

    it('validates multiple line item errors', () => {
      const result = getEditorValidationMessage({
        ...baseOptions,
        hasItemColumns: true,
        itemCount: 2,
        items: [
          { id: '1', _maxImportQuantity: 5, quantity: 10 },
          { id: '2', _maxImportQuantity: 3, quantity: 8 },
        ] as any,
        itemColumns: [] as any,
        collectAll: true,
      })
      expect(result).toContain('modules.validation.maxImportExceeded')
    })
  })
})
