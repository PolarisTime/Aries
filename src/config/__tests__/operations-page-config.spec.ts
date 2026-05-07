import { operationsPageConfigs } from '@/config/business-pages/operations'

describe('operations page config', () => {
  it('keeps freight bill create header focused and uses master carrier options dynamically', () => {
    const config = operationsPageConfigs['freight-bills']
    const formFieldKeys = (config.formFields || []).map((field) => field.key)
    const itemColumnKeys = (config.itemColumns || []).map((column) => column.dataIndex)
    const columnKeys = config.columns.map((column) => column.dataIndex)
    const carrierFilter = config.filters.find((filter) => filter.key === 'carrierName')
    const carrierField = config.formFields?.find((field) => field.key === 'carrierName')
    const vehiclePlateField = config.formFields?.find((field) => field.key === 'vehiclePlate')
    const importedItems = config.parentImport?.transformItems?.({
      id: 'outbound-1',
      outboundNo: 'SO-OUT-001',
      customerName: '客户甲',
      projectName: '项目A',
      items: [
        { id: 'item-1', materialCode: 'M001', material: 'HRB400', spec: '18', length: '12m', brand: '宝钢' },
      ],
    })

    expect(formFieldKeys).toEqual([
      'billNo',
      'outboundNo',
      'carrierName',
      'vehiclePlate',
      'billTime',
      'unitPrice',
      'remark',
    ])
    expect(formFieldKeys).not.toEqual(expect.arrayContaining([
      'customerName',
      'projectName',
      'status',
      'deliveryStatus',
    ]))
    expect(columnKeys).toEqual([
      'status',
      'billNo',
      'carrierName',
      'vehiclePlate',
      'customerName',
      'projectName',
      'billTime',
      'totalWeight',
      'unitPrice',
      'totalFreight',
      'deliveryStatus',
    ])
    expect(itemColumnKeys).not.toEqual(expect.arrayContaining([
      'customerName',
      'projectName',
      'brand',
    ]))
    expect(itemColumnKeys).toEqual(expect.arrayContaining(['materialName']))
    expect(importedItems?.[0]?.materialName).toBe('宝钢')
    expect(typeof carrierFilter?.options).toBe('function')
    expect(typeof carrierField?.options).toBe('function')
    expect(vehiclePlateField?.type).toBe('autoComplete')
    expect(typeof vehiclePlateField?.options).toBe('function')
  })

  it('keeps sales order header fields grouped into the requested three-row layout', () => {
    const config = operationsPageConfigs['sales-orders']
    const statusFilter = config.filters.find((filter) => filter.key === 'status')
    const statusOptionValues = Array.isArray(statusFilter?.options)
      ? statusFilter.options
          .map((option) => ('value' in option ? option.value : null))
          .filter((value): value is string => value != null)
      : []

    expect(config.detailColumnCount).toBe(4)
    expect(statusOptionValues).toEqual(['草稿', '已审核', '待完善', '完成销售'])
    expect(config.detailFields.map((field) => ({
      key: field.key,
      row: field.row,
      fullRow: field.fullRow ?? false,
    }))).toEqual([
      { key: 'customerName', row: 1, fullRow: false },
      { key: 'orderNo', row: 1, fullRow: false },
      { key: 'purchaseOrderNo', row: 1, fullRow: false },
      { key: 'salesName', row: 1, fullRow: false },
      { key: 'projectName', row: 2, fullRow: false },
      { key: 'deliveryDate', row: 2, fullRow: false },
      { key: 'receiptAmount', row: 2, fullRow: false },
      { key: 'closingAmount', row: 2, fullRow: false },
      { key: 'remark', row: 3, fullRow: true },
    ])
    expect(config.formFields?.map((field) => ({
      key: field.key,
      row: field.row,
      fullRow: field.fullRow ?? false,
    }))).toEqual([
      { key: 'customerName', row: 1, fullRow: false },
      { key: 'orderNo', row: 1, fullRow: false },
      { key: 'purchaseOrderNo', row: 1, fullRow: false },
      { key: 'salesName', row: 1, fullRow: false },
      { key: 'projectName', row: 2, fullRow: false },
      { key: 'deliveryDate', row: 2, fullRow: false },
      { key: 'receiptAmount', row: 2, fullRow: false },
      { key: 'closingAmount', row: 2, fullRow: false },
      { key: 'remark', row: 3, fullRow: true },
    ])
    expect(config.saveFields?.scalar).toContain('status')
  })
})
