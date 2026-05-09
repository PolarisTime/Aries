import { useCallback, useState } from 'react'
import { getUserAccountDetail } from '@/api/user-accounts'
import { useRequestError } from '@/hooks/useRequestError'
import type { UserAccountRecord } from '@/types/user-account'

export function useUserAccountDetail() {
  const { showError } = useRequestError()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState<UserAccountRecord | null>(
    null,
  )

  const openDetailModal = useCallback(
    async (record: UserAccountRecord) => {
      setDetailOpen(true)
      setDetailLoading(true)
      try {
        setDetailRecord(await getUserAccountDetail(record.id))
      } catch (error) {
        showError(error, '加载详情失败')
        setDetailOpen(false)
      } finally {
        setDetailLoading(false)
      }
    },
    [showError],
  )

  const closeDetailModal = useCallback(() => {
    setDetailOpen(false)
    setDetailRecord(null)
  }, [])

  return {
    detailOpen,
    detailLoading,
    detailRecord,
    openDetailModal,
    closeDetailModal,
  }
}
