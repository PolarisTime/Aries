import type { ModuleLineItem, ModuleParentImportDefinition } from '@/types/module-page'
import { financeAndReportPageConfigs } from '@/config/business-pages/finance-reports'
import { operationsPageConfigs } from '@/config/business-pages/operations'
import {
  applyMaterialToEditorLineItem,
  buildEditorAuditTarget,
  canManageEditorLineItems,
  buildCustomerStatementDraftData,
  buildDefaultEditorLineItem,
  buildFreightStatementDraftData,
  buildOccupiedParentMap,
  buildParentImportState,
  buildSupplierStatementDraftData,
  getAvailableCustomerStatementOrders,
  getAvailableFreightStatementBills,
  getAvailableSupplierStatementInbounds,
  getCustomerStatementSelectionError,
  getEditorValidationMessage,
  getFreightStatementSelectionError,
  isEditorFieldDisabledForModule,
  isEditorItemColumnEditableForModule,
  isModuleLineItemsLocked,
  isSalesOrderLineLocked,
  normalizeDraftRecordForModule,
  getSupplierStatementSelectionError,
  moveEditorLineItemByDrag,
  parseParentRelationNos,
  recalculateEditorLineItem,
  resolveModuleActionKind,
  syncSystemEditorState,
  trimEditorItemsForModule,
} from '@/views/modules/module-adapters'

const parentImportCases = Object.values({
  ...operationsPageConfigs,
  ...financeAndReportPageConfigs,
})
  .filter((config) => config.parentImport)
  .map((config) => [config.key, config.parentImport!] as const)

function cloneLineItems(value: unknown): ModuleLineItem[] {
  return JSON.parse(JSON.stringify(value ?? [])) as ModuleLineItem[]
}

describe('module-adapters', () => {
  it('routes material export actions through the material-specific handler', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'materials',
      actionLabel: '导出',
      hasFormFields: true,
      isMaterialModule: true,
    })).toBe('exportMaterialRows')
  })

  it('preserves backend userCount when syncing role editor derived fields', () => {
    const editorForm: Record<string, unknown> = {
      permissionCodes: ['user:create', 'user:edit'],
      userCount: 6,
    }

    syncSystemEditorState('role-settings', editorForm)

    expect(editorForm.permissionCount).toBe(2)
    expect(editorForm.permissionSummary).toBeTruthy()
    expect(editorForm.userCount).toBe(6)
  })

  it('routes freight pickup list generation through the freight-specific handler', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'freight-bills',
      actionLabel: '生成提货清单',
      hasFormFields: true,
      isMaterialModule: false,
    })).toBe('openFreightPickupList')
  })

  it('routes registry-configured toolbar actions before generic create/export matching', () => {
    expect(resolveModuleActionKind({
      moduleKey: 'supplier-statements',
      actionLabel: '生成对账单',
      hasFormFields: true,
      isMaterialModule: false,
    })).toBe('openSupplierStatementGenerator')

    expect(resolveModuleActionKind({
      moduleKey: 'freight-statements',
      actionLabel: '查看运费对账汇总',
      hasFormFields: true,
      isMaterialModule: false,
    })).toBe('openFreightSummary')

    expect(resolveModuleActionKind({
      moduleKey: 'role-settings',
      actionLabel: '配置权限',
      hasFormFields: true,
      isMaterialModule: false,
    })).toBe('navigateToRoleActionEditor')
  })

  it('recalculates item weight and amount after applying material defaults', () => {
    const item = buildDefaultEditorLineItem('item-1')
    item.quantity = 3

    applyMaterialToEditorLineItem(item, {
      brand: '宝钢',
      batchNoEnabled: true,
      quantityUnit: '',
      pieceWeightTon: 1.23456,
      piecesPerBundle: 8.6,
      unitPrice: 4567.891,
    })

    expect(item.brand).toBe('宝钢')
    expect(item.batchNo).toBe('')
    expect(item.quantityUnit).toBe('件')
    expect(item.pieceWeightTon).toBe(1.235)
    expect(item.piecesPerBundle).toBe(9)
    expect(item.unitPrice).toBe(4567.89)
    expect(item.weightTon).toBe(3.705)
    expect(item.amount).toBe(16924.03)

    item.amount = 18525
    recalculateEditorLineItem(item, 'amount')
    expect(item.unitPrice).toBe(5000)

    const weighItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('weigh-item'),
      settlementMode: '过磅',
      quantity: 1,
      pieceWeightTon: 2.3,
      weightTon: 2.45,
      unitPrice: 3000,
    }
    recalculateEditorLineItem(weighItem, 'weightTon')
    expect(weighItem.weighWeightTon).toBe(2.45)
    expect(weighItem.weightAdjustmentTon).toBe(0.15)
    expect(weighItem.weightAdjustmentAmount).toBe(450)

    const manualWeighItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('manual-weigh-item'),
      settlementMode: '过磅',
      quantity: 3,
      pieceWeightTon: 4.7,
      weightTon: 14.258,
      unitPrice: 3000,
    }
    recalculateEditorLineItem(manualWeighItem, 'weightTon')
    expect(manualWeighItem.weightTon).toBe(14.258)
    expect(manualWeighItem.weighWeightTon).toBe(14.258)
    expect(manualWeighItem.pieceWeightTon).toBe(4.753)

    manualWeighItem.weightTon = undefined
    recalculateEditorLineItem(manualWeighItem, 'weightTon')
    expect(manualWeighItem.weightTon).toBeUndefined()
    expect(manualWeighItem.weighWeightTon).toBeUndefined()

    const roundedWeighItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('rounded-weigh-item'),
      settlementMode: '过磅',
      category: '盘螺',
      quantity: 4,
      pieceWeightTon: 0.1,
      _sourcePieceWeightTon: 0.1,
      weighWeightTon: 0.43,
      unitPrice: 4000,
    }
    recalculateEditorLineItem(roundedWeighItem, 'weighWeightTon')
    expect(roundedWeighItem.pieceWeightTon).toBe(0.108)
    expect(roundedWeighItem.weighWeightTon).toBe(0.43)
    expect(roundedWeighItem.weightTon).toBe(0.432)
    expect(roundedWeighItem.weightAdjustmentTon).toBe(0.032)
    expect(roundedWeighItem.weightAdjustmentAmount).toBe(128)
    expect(roundedWeighItem.amount).toBe(1728)

    const finalSalesItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('final-sales-item'),
      sourceInboundItemId: 'inbound-item-1',
      quantity: 1,
      pieceWeightTon: 0.108,
      unitPrice: 4000,
      _sourceTotalQuantity: 4,
      _sourcePieceWeightTon: 0.108,
      _sourceWeighWeightTon: 0.43,
      _maxImportQuantity: 1,
    }
    recalculateEditorLineItem(finalSalesItem, 'quantity')
    expect(finalSalesItem.weightTon).toBe(0.106)
    expect(finalSalesItem.amount).toBe(424)

    const finalPurchaseOrderSalesItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('final-po-sales-item'),
      sourcePurchaseOrderItemId: 'po-item-1',
      quantity: 7,
      pieceWeightTon: 2.037,
      unitPrice: 3000,
      _sourceTotalQuantity: 7,
      _sourceTotalWeightTon: 14.258,
      _sourcePieceWeightTon: 2.037,
      _maxImportQuantity: 7,
      _maxImportWeightTon: 14.258,
    }
    recalculateEditorLineItem(finalPurchaseOrderSalesItem, 'quantity')
    expect(finalPurchaseOrderSalesItem.weightTon).toBe(14.258)
    expect(finalPurchaseOrderSalesItem.amount).toBe(42774)
  })

  it('merges imported parent items and replaces items from the same parent relation', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-orders',
      label: '采购订单',
      parentFieldKey: 'sourceOrderNo',
      parentDisplayFieldKey: 'orderNo',
      mapParentToDraft: (parentRecord) => ({
        supplierName: parentRecord.supplierName || '',
      }),
    }

    const currentItems: ModuleLineItem[] = [
      { id: 'item-a', materialCode: 'A', _parentRelationNo: 'PO-1' },
      { id: 'item-b', materialCode: 'B', _parentRelationNo: 'PO-2' },
    ]

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'parent-1',
        orderNo: 'PO-1',
        supplierName: '供应商甲',
        items: [
          { id: 'item-c', materialCode: 'C' },
          { id: 'item-d', materialCode: 'D' },
        ],
      },
      currentParentNos: ['PO-1', 'PO-2'],
      currentItems,
      cloneLineItems,
    })

    expect(nextState.parentNosText).toBe('PO-1, PO-2')
    expect(nextState.hasImportedCurrentParent).toBe(true)
    expect(nextState.shouldApplyMappedValues).toBe(false)
    expect(nextState.mappedValues).toEqual({ supplierName: '供应商甲' })
    expect(nextState.nextItems).toEqual([
      { id: 'item-b', materialCode: 'B', _parentRelationNo: 'PO-2' },
      { id: 'item-c', materialCode: 'C', _parentRelationNo: 'PO-1' },
      { id: 'item-d', materialCode: 'D', _parentRelationNo: 'PO-1' },
    ])
  })

  it('imports sales order purchase order parent items by sales remaining quantity and preserves current allocations on refresh', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-orders',
      label: '上级采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'po-1',
        orderNo: 'PO-001',
        items: [
          { id: 'generated-1', sourcePurchaseOrderItemId: 'src-1', materialCode: 'A', remainingQuantity: 6, quantity: 10 },
          { id: 'generated-2', sourcePurchaseOrderItemId: 'src-2', materialCode: 'B', remainingQuantity: 0, quantity: 4 },
        ],
      },
      currentParentNos: ['PO-001'],
      currentItems: [
        { id: 'item-a', sourcePurchaseOrderItemId: 'src-1', materialCode: 'A', quantity: 4, _parentRelationNo: 'PO-001' },
      ],
      cloneLineItems,
    })

    expect(nextState.importedItemCount).toBe(1)
    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-1',
        quantity: 4,
        _parentRelationNo: 'PO-001',
        _maxImportQuantity: 10,
      }),
    ])
  })

  it('uses purchase order total weight to derive sales order import piece weight', () => {
    const parentImportConfig = operationsPageConfigs['sales-orders'].parentImport!
    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'po-1',
        orderNo: 'PO-001',
        items: [
          {
            id: 'src-po-1',
            materialCode: 'A',
            quantity: 10,
            salesRemainingQuantity: 10,
            pieceWeightTon: 2.4,
            weightTon: 23.55,
            unitPrice: 3000,
          },
          {
            id: 'src-po-2',
            materialCode: 'B',
            quantity: 7,
            salesRemainingQuantity: 7,
            pieceWeightTon: 2.037,
            weightTon: 14.258,
            unitPrice: 3000,
          },
          {
            id: 'src-po-3',
            materialCode: 'C',
            quantity: 7,
            salesRemainingQuantity: 1,
            salesRemainingWeightTon: 2.036,
            pieceWeightTon: 2.037,
            weightTon: 14.258,
            unitPrice: 3000,
          },
        ],
      },
      currentParentNos: [],
      currentItems: [],
      cloneLineItems,
    })

    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-po-1',
        quantity: 10,
        pieceWeightTon: 2.355,
        weightTon: 23.55,
        amount: 70650,
        _parentRelationNo: 'PO-001',
      }),
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-po-2',
        quantity: 7,
        pieceWeightTon: 2.037,
        weightTon: 14.258,
        amount: 42774,
        _sourceTotalWeightTon: 14.258,
        _parentRelationNo: 'PO-001',
      }),
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-po-3',
        quantity: 1,
        pieceWeightTon: 2.037,
        weightTon: 2.036,
        amount: 6108,
        _parentRelationNo: 'PO-001',
      }),
    ])
  })

  it('sums current allocations when the same source inbound item is split across multiple lines', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-inbounds',
      label: '上级采购入库单',
      parentFieldKey: 'purchaseInboundNo',
      parentDisplayFieldKey: 'inboundNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'in-1',
        inboundNo: 'IN-001',
        items: [
          { id: 'generated-1', sourceInboundItemId: 'src-1', materialCode: 'A', remainingQuantity: 5, quantity: 10 },
        ],
      },
      currentParentNos: ['IN-001'],
      currentItems: [
        { id: 'item-a', sourceInboundItemId: 'src-1', materialCode: 'A', quantity: 2, _parentRelationNo: 'IN-001' },
        { id: 'item-b', sourceInboundItemId: 'src-1', materialCode: 'A', quantity: 3, _parentRelationNo: 'IN-001' },
      ],
      cloneLineItems,
    })

    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourceInboundItemId: 'src-1',
        quantity: 5,
        _parentRelationNo: 'IN-001',
        _maxImportQuantity: 10,
      }),
    ])
  })

  it('imports purchase inbound parent items by remaining quantity using purchase order source ids', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-orders',
      label: '上级采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'po-1',
        orderNo: 'PO-001',
        items: [
          { id: 'generated-1', sourcePurchaseOrderItemId: 'src-po-1', materialCode: 'A', remainingQuantity: 7, quantity: 10 },
          { id: 'generated-2', sourcePurchaseOrderItemId: 'src-po-2', materialCode: 'B', remainingQuantity: 0, quantity: 3 },
        ],
      },
      currentParentNos: ['PO-001'],
      currentItems: [
        { id: 'item-a', sourcePurchaseOrderItemId: 'src-po-1', materialCode: 'A', quantity: 2, _parentRelationNo: 'PO-001' },
      ],
      cloneLineItems,
    })

    expect(nextState.importedItemCount).toBe(1)
    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-po-1',
        quantity: 2,
        _parentRelationNo: 'PO-001',
        _maxImportQuantity: 9,
      }),
    ])
  })

  it('drops the default empty draft row when importing parent items into purchase inbound', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-orders',
      label: '上级采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'po-1',
        orderNo: 'PO-001',
        items: [
          { id: 'generated-1', sourcePurchaseOrderItemId: 'src-po-1', materialCode: 'A', remainingQuantity: 7, quantity: 10 },
        ],
      },
      currentParentNos: [],
      currentItems: [
        buildDefaultEditorLineItem('empty-draft-row'),
        { id: 'manual-row', materialCode: 'MANUAL', quantity: 1 },
      ],
      cloneLineItems,
    })

    expect(nextState.nextItems).toEqual([
      expect.objectContaining({ id: 'manual-row', materialCode: 'MANUAL' }),
      expect.objectContaining({
        sourcePurchaseOrderItemId: 'src-po-1',
        quantity: 7,
        _parentRelationNo: 'PO-001',
      }),
    ])
    expect(nextState.nextItems).not.toContainEqual(expect.objectContaining({ id: 'empty-draft-row' }))
  })

  it.each(parentImportCases)('drops the default empty draft row for %s parent imports', (moduleKey, parentImportConfig) => {
    const parentNo = `${moduleKey}-source`
    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: `${moduleKey}-parent`,
        [parentImportConfig.parentDisplayFieldKey]: parentNo,
        supplierName: '供应商甲',
        customerName: '客户甲',
        projectName: '项目A',
        warehouseName: '一号库',
        items: [
          {
            id: `${moduleKey}-source-item`,
            materialCode: 'MAT-001',
            brand: '宝钢',
            category: '螺纹钢',
            material: 'HRB400',
            spec: '10',
            length: '9m',
            unit: '吨',
            batchNo: 'B-001',
            warehouseName: '一号库',
            quantity: 2,
            quantityUnit: '件',
            pieceWeightTon: 1.2,
            weightTon: 2.4,
            unitPrice: 4000,
            amount: 9600,
          },
        ],
      },
      currentParentNos: [],
      currentItems: [
        buildDefaultEditorLineItem('empty-draft-row'),
        { id: 'manual-row', materialCode: 'MANUAL', quantity: 1 },
      ],
      cloneLineItems,
    })

    expect(nextState.nextItems).toHaveLength(2)
    expect(nextState.nextItems).toContainEqual(expect.objectContaining({ id: 'manual-row', materialCode: 'MANUAL' }))
    expect(nextState.nextItems).toContainEqual(expect.objectContaining({ _parentRelationNo: parentNo }))
    expect(nextState.nextItems).not.toContainEqual(expect.objectContaining({ id: 'empty-draft-row' }))
  })

  it('imports sales order parent items using sales order source ids', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'sales-orders',
      label: '上级销售订单',
      parentFieldKey: 'sourceSalesOrderNos',
      parentDisplayFieldKey: 'orderNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'so-1',
        orderNo: 'SO-001',
        items: [
          { id: 'generated-1', sourceSalesOrderItemId: 'src-so-1', materialCode: 'A', quantity: 10, maxImportQuantity: 10 },
        ],
      },
      currentParentNos: ['SO-001'],
      currentItems: [
        { id: 'item-a', sourceSalesOrderItemId: 'src-so-1', materialCode: 'A', quantity: 4, _parentRelationNo: 'SO-001' },
      ],
      cloneLineItems,
    })

    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourceSalesOrderItemId: 'src-so-1',
        quantity: 4,
        _parentRelationNo: 'SO-001',
        _maxImportQuantity: 10,
      }),
    ])
  })

  it('preserves current invoice issue amount and weight when reimporting the same sales order', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'sales-orders',
      label: '上级销售订单',
      parentFieldKey: 'sourceSalesOrderNos',
      parentDisplayFieldKey: 'orderNo',
    }

    const nextState = buildParentImportState({
      parentImportConfig,
      parentRecord: {
        id: 'so-1',
        orderNo: 'SO-001',
        items: [
          {
            id: 'generated-1',
            sourceSalesOrderItemId: 'src-so-1',
            materialCode: 'A',
            quantity: 10,
            weightTon: 5,
            amount: 15000,
            _maxImportWeightTon: 5,
            _maxImportAmount: 15000,
          },
        ],
      },
      currentParentNos: ['SO-001'],
      currentItems: [
        {
          id: 'item-a',
          sourceSalesOrderItemId: 'src-so-1',
          materialCode: 'A',
          quantity: 10,
          weightTon: 1.234,
          amount: 3702,
          _parentRelationNo: 'SO-001',
        },
      ],
      cloneLineItems,
    })

    expect(nextState.nextItems).toEqual([
      expect.objectContaining({
        sourceSalesOrderItemId: 'src-so-1',
        quantity: 10,
        weightTon: 1.234,
        amount: 3702,
        _parentRelationNo: 'SO-001',
        _maxImportWeightTon: 5,
        _maxImportAmount: 15000,
      }),
    ])
  })

  it('parses relation numbers and excludes occupied parent bindings from the current editor record', () => {
    expect(parseParentRelationNos(' A-1, A-2，A-1  A-3 ')).toEqual(['A-1', 'A-2', 'A-3'])

    expect(buildOccupiedParentMap([
      { id: '1', sourceNo: 'P-1, P-2' },
      { id: '2', sourceNo: 'P-3' },
      { id: '3', sourceNo: 'P-4' },
    ], 'sourceNo', '2')).toEqual({
      'P-1': { id: '1', sourceNo: 'P-1, P-2' },
      'P-2': { id: '1', sourceNo: 'P-1, P-2' },
      'P-4': { id: '3', sourceNo: 'P-4' },
    })
  })

  it('builds editor validation messages for required fields, empty items, and occupied parents', () => {
    const parentImportConfig: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-orders',
      label: '采购订单',
      parentFieldKey: 'sourceOrderNo',
      parentDisplayFieldKey: 'orderNo',
      enforceUniqueRelation: true,
    }

    expect(getEditorValidationMessage({
      fields: [{ key: 'supplierName', label: '供应商', type: 'input', required: true }],
      editorForm: {},
      hasItemColumns: false,
      itemCount: 0,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('请填写供应商')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: {},
      hasItemColumns: true,
      items: [],
      itemCount: 0,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('请至少填写一条明细')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: {},
      hasItemColumns: true,
      itemColumns: [
        { title: '商品编码', dataIndex: 'materialCode', required: true },
        { title: '品牌', dataIndex: 'brand', required: true },
      ],
      items: [
        { id: 'item-1', materialCode: '', brand: '宝钢' },
      ],
      itemCount: 1,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('请填写第1行商品编码')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: {},
      hasItemColumns: true,
      itemColumns: [
        { title: '数量', dataIndex: 'quantity', required: true },
      ],
      items: [
        { id: 'item-1', quantity: 11, _maxImportQuantity: 10 },
      ],
      itemCount: 1,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('第1行可关联数量不能超过10件')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: {},
      moduleKey: 'purchase-inbounds',
      hasItemColumns: true,
      itemColumns: [
        { title: '商品编码', dataIndex: 'materialCode', required: true },
      ],
      items: [
        { id: 'item-1', materialCode: 'MAT-001', category: '盘螺', settlementMode: '理算', quantity: 1 },
      ],
      itemCount: 1,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('第1行商品类别需按过磅入库，请将本行结算方式改为过磅')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: {},
      moduleKey: 'purchase-inbounds',
      hasItemColumns: true,
      itemColumns: [
        { title: '商品编码', dataIndex: 'materialCode', required: true },
      ],
      items: [
        { id: 'item-1', materialCode: 'MAT-001', category: '盘螺', settlementMode: '过磅', quantity: 1 },
      ],
      itemCount: 1,
      occupiedParentMap: {},
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('请填写第1行过磅重量')

    expect(getEditorValidationMessage({
      fields: [],
      editorForm: { sourceOrderNo: 'PO-1' },
      hasItemColumns: false,
      itemCount: 1,
      parentImportConfig,
      occupiedParentMap: {
        'PO-1': { id: 'occupied', orderNo: 'PO-LOCK' },
      },
      getPrimaryNo: (record) => String(record.orderNo || record.id),
    })).toBe('采购订单已被PO-LOCK关联')
  })

  it('filters available statement source rows and validates selected sources', () => {
    expect(getAvailableSupplierStatementInbounds([
      { id: '1', inboundNo: 'IN-1', status: '已审核' },
      { id: '2', inboundNo: 'IN-2', status: '草稿' },
    ], [
      { id: 's1', sourceInboundNos: 'IN-1' },
    ])).toEqual([])

    expect(getAvailableCustomerStatementOrders([
      { id: '1', orderNo: 'SO-1', status: '完成销售' },
      { id: '2', orderNo: 'SO-2', status: '草稿' },
    ], [])).toEqual([
      { id: '1', orderNo: 'SO-1', status: '完成销售' },
    ])

    expect(getAvailableFreightStatementBills([
      { id: '1', billNo: 'FB-1' },
      { id: '2', billNo: 'FB-2' },
    ], [
      { id: 's1', sourceBillNos: 'FB-2' },
    ])).toEqual([
      { id: '1', billNo: 'FB-1' },
    ])

    expect(getSupplierStatementSelectionError([])).toBe('请先选择采购入库单')
    expect(getCustomerStatementSelectionError([
      { id: '1', orderNo: 'SO-1', customerName: '客户甲', projectName: '项目A' },
      { id: '2', orderNo: 'SO-2', customerName: '客户乙', projectName: '项目A' },
    ])).toBe('仅支持同一客户同一项目的销售订单合并生成')
    expect(getFreightStatementSelectionError([
      { id: '1', billNo: 'FB-1', carrierName: '物流甲' },
      { id: '2', billNo: 'FB-2', carrierName: '物流乙' },
    ])).toBe('仅支持同一物流商的物流单合并生成')
  })

  it('builds statement drafts from selected source records', () => {
    expect(buildSupplierStatementDraftData({
      baseDraft: { id: 'draft-1', items: [buildDefaultEditorLineItem('empty-draft-row')] },
      sourceInbounds: [
        {
          id: '2',
          inboundNo: 'IN-2',
          inboundDate: '2026-04-11',
          supplierName: '供应商甲',
          totalAmount: 90,
          items: [{ id: 'inbound-item-2', materialCode: 'B', amount: 80 }],
        },
        {
          id: '1',
          inboundNo: 'IN-1',
          inboundDate: '2026-04-10',
          supplierName: '供应商甲',
          totalAmount: 130,
          items: [{ id: 'inbound-item-1', materialCode: 'A', amount: 120 }],
        },
      ],
      payments: [
        { id: 'p1', paymentDate: '2026-04-10', businessType: '供应商', counterpartyName: '供应商甲', status: '已付款', amount: 50 },
        { id: 'p2', paymentDate: '2026-04-12', businessType: '供应商', counterpartyName: '供应商甲', status: '已付款', amount: 10 },
      ],
      today: '2026-04-25',
      defaultFullPayment: false,
      cloneLineItems,
      buildLineItemId: () => 'generated-item',
    })).toMatchObject({
      supplierName: '供应商甲',
      startDate: '2026-04-10',
      endDate: '2026-04-11',
      purchaseAmount: 220,
      paymentAmount: 0,
      closingAmount: 220,
      sourceInboundNos: 'IN-1, IN-2',
      items: [
        { id: 'generated-item', sourceNo: 'IN-1', materialCode: 'A', amount: 120 },
        { id: 'generated-item', sourceNo: 'IN-2', materialCode: 'B', amount: 80 },
      ],
    })

    expect(buildSupplierStatementDraftData({
      baseDraft: { id: 'draft-1' },
      sourceInbounds: [
        {
          id: '2',
          inboundNo: 'IN-2',
          inboundDate: '2026-04-11',
          supplierName: '供应商甲',
          totalAmount: 90,
          items: [{ id: 'inbound-item-2', materialCode: 'B', amount: 80 }],
        },
        {
          id: '1',
          inboundNo: 'IN-1',
          inboundDate: '2026-04-10',
          supplierName: '供应商甲',
          totalAmount: 130,
          items: [{ id: 'inbound-item-1', materialCode: 'A', amount: 120 }],
        },
      ],
      payments: [
        { id: 'p1', paymentDate: '2026-04-10', businessType: '供应商', counterpartyName: '供应商甲', status: '已付款', amount: 50 },
      ],
      today: '2026-04-25',
      defaultFullPayment: true,
      cloneLineItems,
      buildLineItemId: () => 'generated-item',
    })).toMatchObject({
      purchaseAmount: 220,
      paymentAmount: 0,
      closingAmount: 220,
    })

    expect(buildCustomerStatementDraftData({
      baseDraft: { id: 'draft-2', items: [buildDefaultEditorLineItem('empty-draft-row')] },
      sourceOrders: [
        {
          id: '2',
          orderNo: 'SO-2',
          deliveryDate: '2026-04-12',
          customerName: '客户甲',
          projectName: '项目A',
          totalAmount: 90,
          items: [{ id: 'order-item-2', materialCode: 'B', amount: 80 }],
        },
        {
          id: '1',
          orderNo: 'SO-1',
          deliveryDate: '2026-04-10',
          customerName: '客户甲',
          projectName: '项目A',
          totalAmount: 130,
          items: [{ id: 'order-item-1', materialCode: 'A', amount: 120 }],
        },
      ],
      today: '2026-04-25',
      defaultReceiptAmountZero: true,
      cloneLineItems,
      buildLineItemId: () => 'generated-item',
    })).toMatchObject({
      customerName: '客户甲',
      projectName: '项目A',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      salesAmount: 220,
      receiptAmount: 0,
      closingAmount: 220,
      sourceOrderNos: 'SO-1, SO-2',
      items: [
        { id: 'generated-item', sourceNo: 'SO-1', materialCode: 'A', amount: 120 },
        { id: 'generated-item', sourceNo: 'SO-2', materialCode: 'B', amount: 80 },
      ],
    })

    expect(buildCustomerStatementDraftData({
      baseDraft: { id: 'draft-2' },
      sourceOrders: [
        {
          id: '2',
          orderNo: 'SO-2',
          deliveryDate: '2026-04-12',
          customerName: '客户甲',
          projectName: '项目A',
          totalAmount: 90,
          items: [{ id: 'order-item-2', materialCode: 'B', amount: 80 }],
        },
        {
          id: '1',
          orderNo: 'SO-1',
          deliveryDate: '2026-04-10',
          customerName: '客户甲',
          projectName: '项目A',
          totalAmount: 130,
          items: [{ id: 'order-item-1', materialCode: 'A', amount: 120 }],
        },
      ],
      today: '2026-04-25',
      defaultReceiptAmountZero: false,
      cloneLineItems,
      buildLineItemId: () => 'generated-item',
    })).toMatchObject({
      salesAmount: 220,
      receiptAmount: 0,
      closingAmount: 220,
    })

    expect(buildFreightStatementDraftData({
      baseDraft: { id: 'draft-3', items: [buildDefaultEditorLineItem('empty-draft-row')] },
      sourceBills: [
        { id: '2', billNo: 'FB-2', billTime: '2026-04-12', carrierName: '物流甲', totalWeight: 3.2, totalFreight: 40, items: [{ id: 'b', weightTon: 3.2 }] },
        { id: '1', billNo: 'FB-1', billTime: '2026-04-10', carrierName: '物流甲', totalWeight: 2.1, totalFreight: 30, items: [{ id: 'a', weightTon: 2.1 }] },
      ],
      today: '2026-04-25',
      cloneLineItems,
      buildLineItemId: () => 'generated-item',
    })).toMatchObject({
      carrierName: '物流甲',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      totalWeight: 5.3,
      totalFreight: 70,
      unpaidAmount: 70,
      sourceBillNos: 'FB-1, FB-2',
      items: [
        { id: 'generated-item', sourceNo: 'FB-1', weightTon: 2.1 },
        { id: 'generated-item', sourceNo: 'FB-2', weightTon: 3.2 },
      ],
    })
  })

  it('moves dragged editor items to the requested position', () => {
    const items: ModuleLineItem[] = [
      { id: 'item-1' },
      { id: 'item-2' },
      { id: 'item-3' },
    ]

    expect(moveEditorLineItemByDrag(items, 'item-1', 'item-3', 'after')).toEqual([
      { id: 'item-2' },
      { id: 'item-3' },
      { id: 'item-1' },
    ])
    expect(moveEditorLineItemByDrag(items, 'item-3', 'item-1', 'before')).toEqual([
      { id: 'item-3' },
      { id: 'item-1' },
      { id: 'item-2' },
    ])
  })

  it('trims fully empty purchase order line items before save', () => {
    const emptyItem = buildDefaultEditorLineItem('item-empty')
    const validItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('item-valid'),
      materialCode: 'MAT-001',
      brand: '宝钢',
      category: '板材',
      material: 'Q235',
      spec: '10mm',
      quantity: 1,
      pieceWeightTon: 1.25,
      weightTon: 1.25,
      unitPrice: 4000,
      amount: 5000,
    }
    const partialItem: ModuleLineItem = {
      ...buildDefaultEditorLineItem('item-partial'),
      brand: '宝钢',
    }

    expect(trimEditorItemsForModule('purchase-orders', [emptyItem, validItem, partialItem])).toEqual([
      validItem,
      partialItem,
    ])
    expect(trimEditorItemsForModule('sales-orders', [emptyItem])).toEqual([emptyItem])
  })

  it('locks sales order line items only when related sales outbounds are audited', () => {
    expect(isSalesOrderLineLocked(['草稿'])).toBe(false)
    expect(isSalesOrderLineLocked(['价格核准'])).toBe(false)
    expect(isSalesOrderLineLocked(['已审核'])).toBe(true)
    expect(isModuleLineItemsLocked('sales-orders', ['已审核'])).toBe(true)
    expect(isModuleLineItemsLocked('purchase-orders', ['已审核'])).toBe(false)

    expect(buildEditorAuditTarget('sales-orders', ['草稿', '已审核', '完成销售'], false)).toEqual({
      key: 'status',
      value: '已审核',
    })
    expect(buildEditorAuditTarget('sales-orders', ['草稿', '已审核', '完成销售'], true)).toEqual({
      key: 'status',
      value: '完成销售',
    })
    expect(buildEditorAuditTarget('purchase-inbounds', ['草稿', '已审核'], false)).toEqual({
      key: 'status',
      value: '已审核',
    })

    expect(isEditorFieldDisabledForModule('sales-orders', 'deliveryDate', false, true, true)).toBe(false)
    expect(isEditorFieldDisabledForModule('sales-orders', 'remark', false, true, true)).toBe(false)
    expect(isEditorFieldDisabledForModule('sales-orders', 'salesName', false, true, true)).toBe(true)

    expect(isEditorItemColumnEditableForModule('sales-orders', 'unitPrice', true, true)).toBe(true)
    expect(isEditorItemColumnEditableForModule('sales-orders', 'amount', true, true)).toBe(false)
    expect(isEditorItemColumnEditableForModule('sales-orders', 'quantity', true, true)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'pieceWeightTon', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'brand', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'quantityUnit', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'amount', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-inbounds', 'weightTon', true, false)).toBe(true)
    expect(isEditorItemColumnEditableForModule('purchase-inbounds', 'pieceWeightTon', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-inbounds', 'warehouseName', true, false)).toBe(true)
    expect(isEditorItemColumnEditableForModule('purchase-inbounds', 'batchNo', true, false)).toBe(false)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'quantity', true, false)).toBe(true)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'unitPrice', true, false)).toBe(true)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'warehouseName', true, false)).toBe(true)
    expect(isEditorItemColumnEditableForModule('purchase-orders', 'batchNo', true, false)).toBe(true)

    expect(canManageEditorLineItems('sales-orders', true, true, true)).toBe(false)
    expect(canManageEditorLineItems('purchase-orders', true, true, true)).toBe(true)
  })

  it('applies registry configured current-operator defaults', () => {
    const purchaseDraft = normalizeDraftRecordForModule({
      moduleKey: 'purchase-orders',
      record: { id: 'po-1' },
      items: [],
      primaryNoKey: 'orderNo',
      generatePrimaryNo: () => 'PO0001',
      currentOperatorName: '采购A',
      sumLineItemsBy: (items, key) => items.reduce((sum, item) => sum + Number(item[key] || 0), 0),
    })

    expect(purchaseDraft).toMatchObject({
      orderNo: 'PO0001',
      buyerName: '采购A',
      status: '草稿',
    })
  })

  it('normalizes invoice drafts from imported detail rows', () => {
    const receiptDraft = normalizeDraftRecordForModule({
      moduleKey: 'invoice-receipts',
      record: { id: 'r-1', taxAmount: 100 },
      items: [
        { id: 'i-1', sourceNo: 'PO-1', amount: 120.12 },
        { id: 'i-2', sourceNo: 'PO-2', amount: 80.34 },
      ],
      primaryNoKey: 'receiveNo',
      generatePrimaryNo: () => 'SP0001',
      currentOperatorName: '财务A',
      sumLineItemsBy: (items, key) => items.reduce((sum, item) => sum + Number(item[key] || 0), 0),
    })

    expect(receiptDraft).toMatchObject({
      receiveNo: 'SP0001',
      sourcePurchaseOrderNos: 'PO-1, PO-2',
      amount: 200.46,
      operatorName: '财务A',
    })

    const issueDraft = normalizeDraftRecordForModule({
      moduleKey: 'invoice-issues',
      record: { id: 'r-2', taxAmount: 200 },
      items: [
        { id: 'i-1', sourceNo: 'SO-1', amount: 99.99 },
        { id: 'i-2', sourceNo: 'SO-1', amount: 100.01 },
      ],
      primaryNoKey: 'issueNo',
      generatePrimaryNo: () => 'KP0001',
      currentOperatorName: '财务B',
      sumLineItemsBy: (items, key) => items.reduce((sum, item) => sum + Number(item[key] || 0), 0),
    })

    expect(issueDraft).toMatchObject({
      issueNo: 'KP0001',
      sourceSalesOrderNos: 'SO-1',
      amount: 200,
      operatorName: '财务B',
    })
  })

  it('trims zero-amount invoice detail rows before save', () => {
    expect(trimEditorItemsForModule('invoice-issues', [
      { id: 'i-1', amount: 120, weightTon: 3 },
      { id: 'i-2', amount: 0, weightTon: 0 },
    ])).toEqual([
      { id: 'i-1', amount: 120, weightTon: 3 },
    ])
  })
})

describe('normalizeDraftRecordForModule — registry callback delegation', () => {
  const ctx = {
    generatePrimaryNo: () => 'NO-001',
    currentOperatorName: '测试员',
    sumLineItemsBy: (items: ModuleLineItem[], key: string) =>
      items.reduce((sum, i) => sum + Number(i[key] || 0), 0),
  }

  it('freight-bills: delegates to registry callback for totalWeight/totalFreight/deliveryStatus', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'freight-bills',
      record: { id: '0', unitPrice: '200' },
      items: [{ id: 'item-1', weightTon: 5 }, { id: 'item-2', weightTon: 3 }],
      ...ctx,
    })
    expect(result.totalWeight).toBe(8)
    expect(result.totalFreight).toBe(1600)
    expect(result.deliveryStatus).toBe('未送达')
  })

  it('supplier-statements: delegates to registry callback for purchaseAmount/closingAmount', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'supplier-statements',
      record: { id: '0' },
      items: [
        { id: 'item-1', amount: 100, sourceNo: 'INB-001' },
        { id: 'item-2', amount: 200, sourceNo: 'INB-002' },
      ],
      ...ctx,
    })
    expect(result.purchaseAmount).toBe(300)
    expect(result.closingAmount).toBe(300)
    expect(result.sourceInboundNos).toContain('INB-001')
  })

  it('customer-statements: delegates to registry for salesAmount/sourceOrderNos', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'customer-statements',
      record: { id: '0' },
      items: [{ id: 'item-1', amount: 500, sourceNo: 'SO-X' }],
      ...ctx,
    })
    expect(result.salesAmount).toBe(500)
    expect(result.sourceOrderNos).toBe('SO-X')
  })

  it('freight-statements: computes weight, unpaidAmount, and attachment string', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'freight-statements',
      record: { id: '0', totalFreight: 1000, paidAmount: 300, attachments: [{ name: 'a.pdf' }, { name: 'b.pdf' }] },
      items: [{ id: 'item-1', weightTon: 2 }, { id: 'item-2', weightTon: 3 }],
      ...ctx,
    })
    expect(result.totalWeight).toBe(5)
    expect(result.unpaidAmount).toBe(700)
    expect(result.attachment).toBe('a.pdf, b.pdf')
  })

  it('role-settings: normalizes permissionCodes array', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'role-settings',
      record: { id: '0', permissionCodes: ['perm:a', 'perm:b'] },
      items: [],
      ...ctx,
    })
    expect(result.permissionCount).toBe(2)
  })

  it('invoice-receipts: computes amount and deduplicates source nos', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'invoice-receipts',
      record: { id: '0' },
      items: [
        { id: 'item-1', amount: 100, sourceNo: 'PO-A' },
        { id: 'item-2', amount: 50, sourceNo: 'PO-A' },
      ],
      ...ctx,
    })
    expect(result.amount).toBe(150)
    expect(result.sourcePurchaseOrderNos).toBe('PO-A')
  })

  it('unknown module: no crash, defaults applied', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'nonexistent-module',
      record: { id: '0' },
      items: [],
      ...ctx,
    })
    expect(result).toBeDefined()
  })

  it('applies defaultStatus when record.status is empty', () => {
    const result = normalizeDraftRecordForModule({
      moduleKey: 'purchase-orders',
      record: { id: '0' },
      items: [],
      ...ctx,
    })
    expect(result.status).toBe('草稿')
  })
})

describe('syncSystemEditorState — registry callback delegation', () => {
  it('role-settings: delegates to syncEditorForm callback', () => {
    const form: Record<string, unknown> = { permissionCodes: ['perm:x', 'perm:y'] }
    syncSystemEditorState('role-settings', form)
    expect(form.permissionCount).toBe(2)
  })

  it('user-accounts: delegates to syncEditorForm callback', () => {
    const form: Record<string, unknown> = { roleNames: '管理员, 采购' }
    syncSystemEditorState('user-accounts', form)
    expect(form.roleNames).toEqual(['管理员', '采购'])
  })

  it('unknown module: no-op without crashing', () => {
    const form: Record<string, unknown> = { someKey: 'value' }
    syncSystemEditorState('unknown-module', form)
    expect(form.someKey).toBe('value')
  })
})
