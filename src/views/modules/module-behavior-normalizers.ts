import { asString } from '@/utils/type-narrowing'
import { registerModuleBehavior } from '@/views/modules/module-behavior-registry-core'
import {
  collectUniqueSourceNos,
} from '@/views/modules/module-behavior-registry-utils'

registerModuleBehavior('freight-bill', {
  normalizeDraftRecord(record, items, ctx) {
    const firstSourceItem = items.find((item) =>
      asString(item.sourceNo).trim(),
    )
    const customerNames = Array.from(
      new Set(
        items.map((item) => asString(item.customerName).trim()).filter(Boolean),
      ),
    )
    const projectNames = Array.from(
      new Set(
        items.map((item) => asString(item.projectName).trim()).filter(Boolean),
      ),
    )
    const sourceNos = collectUniqueSourceNos(items)
    if (sourceNos) {
      record.outboundNo = sourceNos
    } else if (!record.outboundNo && firstSourceItem) {
      record.outboundNo = firstSourceItem.sourceNo
    }
    if (customerNames.length > 1) {
      record.customerName = '多客户'
    } else if (customerNames.length === 1) {
      record.customerName = customerNames[0]
    }
    if (projectNames.length > 1) {
      record.projectName = '多项目'
    } else if (projectNames.length === 1) {
      record.projectName = projectNames[0]
    }
    record.totalWeight = Number(
      ctx.sumLineItemsBy(items, 'weightTon').toFixed(3),
    )
    record.totalFreight = Number(
      (Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(
        2,
      ),
    )
    if (!record.deliveryStatus) {
      record.deliveryStatus = '未送达'
    }
  },
})

registerModuleBehavior('freight-statement', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.totalWeight = Number(
        ctx.sumLineItemsBy(items, 'weightTon').toFixed(3),
      )
    }
    record.unpaidAmount = Number(
      (
        Number(record.totalFreight || 0) - Number(record.paidAmount || 0)
      ).toFixed(2),
    )
    if (Array.isArray(record.attachments)) {
      record.attachment = record.attachments
        .map((item) => asString((item as Record<string, unknown>).name))
        .filter(Boolean)
        .join(', ')
    }
  },
})

registerModuleBehavior('supplier-statement', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.purchaseAmount = Number(
        ctx.sumLineItemsBy(items, 'amount').toFixed(2),
      )
      record.sourceInboundNos = collectUniqueSourceNos(items)
    }
    record.paymentAmount = Number(record.paymentAmount || 0)
    record.closingAmount = Number(Number(record.purchaseAmount || 0).toFixed(2))
  },
})

registerModuleBehavior('customer-statement', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.salesAmount = Number(
        ctx.sumLineItemsBy(items, 'amount').toFixed(2),
      )
      record.sourceOrderNos = collectUniqueSourceNos(items)
    }
    record.receiptAmount = Number(record.receiptAmount || 0)
    record.closingAmount = Number(Number(record.salesAmount || 0).toFixed(2))
  },
})

registerModuleBehavior('invoice-receipt', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.amount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourcePurchaseOrderNos = collectUniqueSourceNos(items)
    }
  },
})

registerModuleBehavior('invoice-issue', {
  normalizeDraftRecord(record, items, ctx) {
    if (items.length) {
      record.amount = Number(ctx.sumLineItemsBy(items, 'amount').toFixed(2))
      record.sourceSalesOrderNos = collectUniqueSourceNos(items)
    }
  },
})
