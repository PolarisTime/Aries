import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { parseParentRelationNos } from '@/views/modules/module-adapter-shared'

export function getAvailableSupplierStatementInbounds(
  inbounds: ModuleRecord[],
  statements: ModuleRecord[],
) {
  const occupiedInboundNoSet = new Set(
    statements.flatMap((record) =>
      parseParentRelationNos(record.sourceInboundNos),
    ),
  )

  return inbounds.filter((record) => {
    const inboundNo = asString(record.inboundNo)
    return (
      inboundNo &&
      asString(record.status) !== '草稿' &&
      !occupiedInboundNoSet.has(inboundNo)
    )
  })
}

export function getAvailableCustomerStatementOrders(
  orders: ModuleRecord[],
  statements: ModuleRecord[],
) {
  const occupiedOrderNoSet = new Set(
    statements.flatMap((record) =>
      parseParentRelationNos(record.sourceOrderNos),
    ),
  )

  return orders.filter((record) => {
    const orderNo = asString(record.orderNo)
    const status = asString(record.status)
    return (
      orderNo &&
      (status === '待完善' || status === '完成销售') &&
      !occupiedOrderNoSet.has(orderNo)
    )
  })
}

export function getAvailableFreightStatementBills(
  bills: ModuleRecord[],
  statements: ModuleRecord[],
) {
  const occupiedBillNoSet = new Set(
    statements.flatMap((record) =>
      parseParentRelationNos(record.sourceBillNos),
    ),
  )

  return bills.filter((record) => {
    const billNo = asString(record.billNo)
    return billNo && !occupiedBillNoSet.has(billNo)
  })
}
