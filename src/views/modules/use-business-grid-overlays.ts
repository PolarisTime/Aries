import { useState } from 'react'
import type { ModuleRecord } from '@/types/module-page'

export function useBusinessGridOverlays() {
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId, setAttachRecordId] = useState('')
  const [supplierStatementOpen, setSupplierStatementOpen] = useState(false)
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false)
  const [freightStatementOpen, setFreightStatementOpen] = useState(false)
  const [freightPickupOpen, setFreightPickupOpen] = useState(false)
  const [freightPickupRecords, setFreightPickupRecords] = useState<
    ModuleRecord[]
  >([])
  const [prepaymentAllocationPayment, setPrepaymentAllocationPayment] =
    useState<ModuleRecord | null>(null)

  const openAttachment = (record: ModuleRecord) => {
    setAttachRecordId(String(record.id || ''))
    setAttachOpen(true)
  }

  const closeAttachment = () => {
    setAttachOpen(false)
    setAttachRecordId('')
  }

  return {
    attachOpen,
    attachRecordId,
    supplierStatementOpen,
    customerStatementOpen,
    freightStatementOpen,
    freightPickupOpen,
    prepaymentAllocationOpen: prepaymentAllocationPayment !== null,
    prepaymentAllocationPayment,
    openAttachment,
    closeAttachment,
    openSupplierStatement: () => setSupplierStatementOpen(true),
    closeSupplierStatement: () => setSupplierStatementOpen(false),
    openCustomerStatement: () => setCustomerStatementOpen(true),
    closeCustomerStatement: () => setCustomerStatementOpen(false),
    openFreightStatement: () => setFreightStatementOpen(true),
    closeFreightStatement: () => setFreightStatementOpen(false),
    freightPickupRecords,
    openFreightPickup: (records: ModuleRecord[]) => {
      setFreightPickupRecords(records)
      setFreightPickupOpen(true)
    },
    closeFreightPickup: () => {
      setFreightPickupOpen(false)
      setFreightPickupRecords([])
    },
    openPrepaymentAllocation: (payment: ModuleRecord) => {
      setPrepaymentAllocationPayment(payment)
    },
    closePrepaymentAllocation: () => {
      setPrepaymentAllocationPayment(null)
    },
  }
}
