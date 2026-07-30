import { useState } from 'react'
import type { ModuleRecord } from '@/types/module-page'

export function useBusinessGridOverlays() {
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId, setAttachRecordId] = useState('')

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
    openAttachment,
    closeAttachment,
  }
}
