import { useCallback, useState } from 'react'
import type { ModuleRecord } from '@/types/module-page'

export function useBusinessGridOverlays() {
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId, setAttachRecordId] = useState('')
  const [supplierStatementOpen, setSupplierStatementOpen] = useState(false)
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false)
  const [freightStatementOpen, setFreightStatementOpen] = useState(false)
  const [freightPickupOpen, setFreightPickupOpen] = useState(false)

  const openAttachment = useCallback((record: ModuleRecord) => {
    setAttachRecordId(String(record.id || ''))
    setAttachOpen(true)
  }, [])

  const closeAttachment = useCallback(() => {
    setAttachOpen(false)
    setAttachRecordId('')
  }, [])

  return {
    attachOpen,
    attachRecordId,
    supplierStatementOpen,
    customerStatementOpen,
    freightStatementOpen,
    freightPickupOpen,
    openAttachment,
    closeAttachment,
    openSupplierStatement: useCallback(
      () => setSupplierStatementOpen(true),
      [],
    ),
    closeSupplierStatement: useCallback(
      () => setSupplierStatementOpen(false),
      [],
    ),
    openCustomerStatement: useCallback(
      () => setCustomerStatementOpen(true),
      [],
    ),
    closeCustomerStatement: useCallback(
      () => setCustomerStatementOpen(false),
      [],
    ),
    openFreightStatement: useCallback(() => setFreightStatementOpen(true), []),
    closeFreightStatement: useCallback(
      () => setFreightStatementOpen(false),
      [],
    ),
    openFreightPickup: useCallback(() => setFreightPickupOpen(true), []),
    closeFreightPickup: useCallback(() => setFreightPickupOpen(false), []),
  }
}
