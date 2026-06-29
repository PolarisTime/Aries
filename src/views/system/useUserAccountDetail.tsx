import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getUserAccountDetail } from '@/api/user-accounts'
import { useRequestError } from '@/hooks/useRequestError'
import type { UserAccountRecord } from '@/shared/schemas'

export function useUserAccountDetail() {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailRecord, setDetailRecord] = useState<UserAccountRecord | null>(
    null,
  )

  const openDetailModal = async (record: UserAccountRecord) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      setDetailRecord(await getUserAccountDetail(record.id))
      setDetailLoading(false)
    } catch (error) {
      showError(error, t('api.loadUserDetailFailed'))
      setDetailOpen(false)
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setDetailOpen(false)
    setDetailRecord(null)
  }

  return {
    detailOpen,
    detailLoading,
    detailRecord,
    openDetailModal,
    closeDetailModal,
  }
}
