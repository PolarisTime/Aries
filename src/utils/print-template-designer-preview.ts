import type { ModuleRecord } from '@/types/module-page'
import type { ModulePageConfig } from '@/types/module-page'
import {
  getPrintTemplateSampleCustomers,
  getPrintTemplateSampleProjects,
  getPrintTemplateSampleSuppliers,
  getPrintTemplateSampleWarehouses,
  inferPrintTemplateRowValue,
} from '@/utils/print-template-designer-samples'
import type { PrintTemplatePreviewData } from '@/utils/print-template-designer-types'

function sumBy(details: Array<ModuleRecord>, key: string) {
  return details.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

export function buildPrintTemplatePreviewData(
  config: ModulePageConfig,
): PrintTemplatePreviewData {
  const detailColumns = config.itemColumns || []
  const detailCount = detailColumns.length ? 3 : 0

  const details = Array.from({ length: detailCount }, (_, index) => {
    const item = detailColumns.reduce<ModuleRecord>(
      (row, column) => {
        row[column.dataIndex] = inferPrintTemplateRowValue(
          column.dataIndex,
          column.type,
          index,
        )
        return row
      },
      {} as ModuleRecord,
    )

    const unitPrice = Number(item.unitPrice || 1280 + index * 135.5)
    const quantity = Number(item.quantity || 18 + index * 6)
    const weightTon = Number(item.weightTon || 12.36 + index * 1.28)

    if (item.unitPrice == null) {
      item.unitPrice = unitPrice.toFixed(2)
    }
    if (item.quantity == null) {
      item.quantity = String(quantity)
    }
    if (item.weightTon == null) {
      item.weightTon = weightTon.toFixed(3)
    }
    if (item.amount == null) {
      item.amount = (unitPrice * weightTon).toFixed(2)
    }
    if (item.warehouseName != null) {
      item.warehouse = { name: item.warehouseName }
    }

    return {
      ...item,
      id: `preview-item-${index + 1}`,
    }
  })

  const totalWeight = sumBy(details, 'weightTon').toFixed(3)
  const totalAmount = sumBy(details, 'amount').toFixed(2)

  const model = config.detailFields.reduce<ModuleRecord>(
    (record, field, index) => {
      record[field.key] = inferPrintTemplateRowValue(
        field.key,
        field.type,
        index,
      )
      return record
    },
    {} as ModuleRecord,
  )

  if (config.primaryNoKey) {
    model[config.primaryNoKey] =
      `${config.key.toUpperCase().replaceAll('-', '')}-20260426-001`
  }

  if ('totalWeight' in model) {
    model.totalWeight = totalWeight
  }
  if ('totalAmount' in model) {
    model.totalAmount = totalAmount
  }
  if ('supplierName' in model) {
    model.supplierName = getPrintTemplateSampleSuppliers()[0]
  }
  if ('customerName' in model) {
    model.customerName = getPrintTemplateSampleCustomers()[0]
  }
  if ('warehouseName' in model) {
    model.warehouseName = getPrintTemplateSampleWarehouses()[0]
  }
  if ('projectName' in model) {
    model.projectName = getPrintTemplateSampleProjects()[0]
  }
  if ('status' in model) {
    model.status = '草稿'
  }
  model.meta = {
    operatorName: '系统管理员',
    generatedFrom: '打印模板设计器',
  }

  return {
    model,
    details,
  }
}
