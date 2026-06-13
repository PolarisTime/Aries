import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'
import { collectUniqueSourceNos } from '@/module-system/module-behavior-registry-utils'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

registerModuleBehavior('freight-bill', {
  normalizeDraftRecord(record, items, ctx) {
    const firstSourceItem = items.find((item) => asString(item.sourceNo).trim())
    const customerNames = Array.from(
      new Set(
        items.flatMap((item) => {
          const name = asString(item.customerName).trim()
          return name ? [name] : []
        }),
      ),
    )
    const projectNames = Array.from(
      new Set(
        items.flatMap((item) => {
          const name = asString(item.projectName).trim()
          return name ? [name] : []
        }),
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
  },
})

registerModuleBehavior('freight-statement', {
  normalizeDraftRecord(record, items, ctx) {
    const sourceBillNos = collectUniqueSourceNos(items)
    if (sourceBillNos) {
      record.sourceBillNos = sourceBillNos
    }
    if (items.length) {
      record.totalWeight = Number(
        ctx.sumLineItemsBy(items, 'weightTon').toFixed(3),
      )
      const sourceFreightMap = new Map<string, number>()
      const sourceBillDates: string[] = []
      items.forEach((item) => {
        const sourceNo = asString(item.sourceNo).trim()
        if (!sourceNo) {
          return
        }
        if (!sourceFreightMap.has(sourceNo)) {
          sourceFreightMap.set(sourceNo, Number(item._parentTotalFreight || 0))
        }
        const sourceBillTime = asString(item._parentBillTime).trim()
        if (sourceBillTime) {
          sourceBillDates.push(sourceBillTime)
        }
      })
      const sourceFreights = Array.from(sourceFreightMap.values())
      if (sourceFreightMap.size) {
        record.totalFreight = Number(
          sourceFreights.reduce((sum, value) => sum + value, 0).toFixed(2),
        )
      }
      if (sourceBillDates.length) {
        const sortedDates = sourceBillDates.toSorted()
        record.startDate = sortedDates[0]
        record.endDate = sortedDates[sortedDates.length - 1]
      }
    }
    record.paidAmount = Number(record.paidAmount || 0)
    record.unpaidAmount = Number(
      (
        Number(record.totalFreight || 0) - Number(record.paidAmount || 0)
      ).toFixed(2),
    )
    if (Array.isArray(record.attachments)) {
      record.attachment = record.attachments
        .flatMap((item) => {
          const v = asString((item as ModuleRecord).name)
          return v ? [v] : []
        })
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
      const sourceDates = items
        .flatMap((item) => {
          const sourceDate = asString(item._parentBillTime).trim()
          return sourceDate ? [sourceDate] : []
        })
        .toSorted()
      if (sourceDates.length) {
        record.startDate = sourceDates[0]
        record.endDate = sourceDates[sourceDates.length - 1]
      }
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
      const sourceDates = items
        .flatMap((item) => {
          const sourceDate = asString(item._parentBillTime).trim()
          return sourceDate ? [sourceDate] : []
        })
        .toSorted()
      if (sourceDates.length) {
        record.startDate = sourceDates[0]
        record.endDate = sourceDates[sourceDates.length - 1]
      }
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
