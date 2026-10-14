import {
  normalizeCarrierDraftRecord,
  normalizeCarrierEditorRecord,
} from '@/config/business-pages/master/carrier-vehicle-adapter'
import {
  FIXED_FREIGHT_AMOUNT_FIELD,
  isFixedFreightSettlement,
  resolveFixedFreightAmount,
  resolveFreightSettlementMode,
  SETTLEMENT_MODE_FIELD,
} from '@/constants/freight-settlement'
import { INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'
import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import { collectUniqueSourceNos } from '@/module-system/behavior/module-behavior-registry-utils'
import { normalizeStatementDirection } from '@/shared/schemas/customer-statement'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export const contributeNormalizerBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
  registerModuleBehavior('carrier', {
    normalizeEditorRecord: normalizeCarrierEditorRecord,
    normalizeDraftRecord: normalizeCarrierDraftRecord,
  })

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
        ctx
          .sumLineItemsBy(items, 'weightTon')
          .toFixed(INTERNAL_WEIGHT_PRECISION),
      )
      // 结算金额口径：按吨位 = 单价 × 吨位合计（历史口径，数值完全不变）；
      // 固定运费 = 固定运费金额。totalFreight 就是本次结算金额（入账/对账单/列表「总运费」都读它）。
      record[SETTLEMENT_MODE_FIELD] = resolveFreightSettlementMode(record)
      const fixedFreightAmount = resolveFixedFreightAmount(record)
      if (isFixedFreightSettlement(record)) {
        record[FIXED_FREIGHT_AMOUNT_FIELD] = fixedFreightAmount
        record.totalFreight = Number((fixedFreightAmount ?? 0).toFixed(2))
      } else {
        // 按吨位模式必须显式落 null：后端把该模式下的非 null 金额视为互斥冲突（422），
        // null 则用于清空库里遗留的固定金额。
        record[FIXED_FREIGHT_AMOUNT_FIELD] = null
        record.totalFreight = Number(
          (
            Number(record.unitPrice || 0) * Number(record.totalWeight || 0)
          ).toFixed(2),
        )
      }
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
            sourceFreightMap.set(
              sourceNo,
              Number(item._parentTotalFreight || 0),
            )
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
    normalizeEditorRecord(record) {
      return {
        ...record,
        direction: normalizeStatementDirection(record.direction),
      }
    },
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
      record.direction = normalizeStatementDirection(record.direction)
    },
  })
}
