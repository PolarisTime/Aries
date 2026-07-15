import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'
import { collectUniqueSourceNos } from '@/module-system/module-behavior-registry-utils'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

registerModuleBehavior('freight-bill', {
  normalizeEditorRecord(record) {
    const sourceOrderNos = collectUniqueSourceNos(
      (Array.isArray(record.items) ? record.items : []).filter(
        (item) => item.sourceSalesOrderItemId != null,
      ),
    )
    return { ...record, sourceOrderNos }
  },
  normalizeDraftRecord(record, items, ctx) {
    const sourceNos = collectUniqueSourceNos(
      items.filter((item) => item.sourceSalesOrderItemId != null),
    )
    if (sourceNos) {
      record.sourceOrderNos = sourceNos
    }
    record.totalWeight = Number(
      ctx.sumLineItemsBy(items, 'weightTon').toFixed(INTERNAL_WEIGHT_PRECISION),
    )
    record.totalFreight = Number(
      (Number(record.unitPrice || 0) * Number(record.totalWeight || 0)).toFixed(
        2,
      ),
    )
  },
})

registerModuleBehavior('freight-statement', {
  normalizeEditorRecord(record) {
    const sourceBillNos = collectUniqueSourceNos(
      (Array.isArray(record.items) ? record.items : []).filter(
        (item) => item.sourceFreightBillItemId != null,
      ),
    )
    return { ...record, sourceBillNos }
  },
  normalizeDraftRecord(record, items, ctx) {
    const sourceBillNos = collectUniqueSourceNos(items)
    if (sourceBillNos) {
      record.sourceBillNos = sourceBillNos
    }
    if (items.length) {
      record.totalWeight = Number(
        ctx
          .sumLineItemsBy(items, 'weightTon')
          .toFixed(INTERNAL_WEIGHT_PRECISION),
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
