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
      'billNo',
      'carrierName',
      'vehiclePlate',
      'billTime',
      'totalWeight',
      'unitPrice',
      'totalFreight',
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
})
