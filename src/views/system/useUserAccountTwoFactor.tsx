import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  disableUserAccount2fa,
  enableUserAccount2fa,
  getUserAccountDetail,
  setupUserAccount2fa,
} from '@/api/user-accounts'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { syncCurrentUserTotpStateById } from '@/stores/auth-user-sync'
import { useAuthStore } from '@/stores/authStore'
import type { TotpSetupResponse } from '@/types/auth'
import type { UserAccountRecord } from '@/types/user-account'
import { message, modal } from '@/utils/antd-app'

export function useUserAccountTwoFactor() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const currentUser = useAuthStore((state) => state.user)

  const [twoFaOpen, setTwoFaOpen] = useState(false)
  const [twoFaLoading, setTwoFaLoading] = useState(false)
  const [twoFaRecord, setTwoFaRecord] = useState<UserAccountRecord | null>(null)
  const [twoFaSetup, setTwoFaSetup] = useState<TotpSetupResponse | null>(null)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [twoFaSetupLoading, setTwoFaSetupLoading] = useState(false)
  const [twoFaEnableLoading, setTwoFaEnableLoading] = useState(false)
  const [twoFaDisableLoading, setTwoFaDisableLoading] = useState(false)

  const syncCurrentUserTotpState = useCallback(
    (record: UserAccountRecord | null) => {
      if (!record || !currentUser) return
      if (String(currentUser.id) !== String(record.id)) return
      syncCurrentUserTotpStateById(record.id, record.totpEnabled)
    },
    [currentUser],
  )

  const refreshUsers = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userAccountBase })
  }, [queryClient])

  const open2faModal = useCallback(
    async (record: UserAccountRecord) => {
      setTwoFaOpen(true)
      setTwoFaLoading(true)
      setTwoFaSetup(null)
      setTwoFaCode('')
      try {
        setTwoFaRecord(await getUserAccountDetail(record.id))
      } catch (error) {
        showError(error, t('auth.user2fa.loadFailed'))
        setTwoFaOpen(false)
      } finally {
        setTwoFaLoading(false)
      }
    },
    [showError, t],
  )

  const handleGenerate2fa = useCallback(async () => {
    if (!twoFaRecord) return
    setTwoFaSetupLoading(true)
    try {
      const response = await setupUserAccount2fa(twoFaRecord.id)
      setTwoFaSetup(response.data)
      setTwoFaCode('')
      message.success(response.message || t('auth.user2fa.generateSuccess'))
    } catch (error) {
      showError(error, t('auth.user2fa.generateFailed'))
    } finally {
      setTwoFaSetupLoading(false)
    }
  }, [showError, t, twoFaRecord])

  const handleEnable2fa = useCallback(async () => {
    if (!twoFaRecord) return
    if (!/^\d{6}$/.test(twoFaCode.trim())) {
      message.warning(t('auth.user2fa.codeInvalid'))
      return
    }
    setTwoFaEnableLoading(true)
    try {
      const response = await enableUserAccount2fa(
        twoFaRecord.id,
        twoFaCode.trim(),
      )
      setTwoFaRecord(response.data)
      syncCurrentUserTotpState(response.data)
      setTwoFaSetup(null)
      setTwoFaCode('')
      message.success(response.message || t('auth.user2fa.enableSuccess'))
      setTwoFaOpen(false)
      refreshUsers()
    } catch (error) {
      showError(error, t('auth.user2fa.enableFailed'))
    } finally {
      setTwoFaEnableLoading(false)
    }
  }, [
    refreshUsers,
    showError,
    syncCurrentUserTotpState,
    t,
    twoFaCode,
    twoFaRecord,
  ])

  const handleDisable2fa = useCallback(() => {
    if (!twoFaRecord) return
    modal.confirm({
      title: t('auth.user2fa.disableTitle'),
      content: t('auth.user2fa.disableContent', {
        loginName: twoFaRecord.loginName,
      }),
      okText: t('auth.user2fa.disableOk'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        setTwoFaDisableLoading(true)
        try {
          const response = await disableUserAccount2fa(twoFaRecord.id)
          setTwoFaRecord(response.data)
          syncCurrentUserTotpState(response.data)
          setTwoFaSetup(null)
          setTwoFaCode('')
          message.success(response.message || t('auth.user2fa.disableSuccess'))
          setTwoFaOpen(false)
          refreshUsers()
        } catch (error) {
          showError(error, t('auth.user2fa.disableFailed'))
        } finally {
          setTwoFaDisableLoading(false)
        }
      },
    })
  }, [refreshUsers, showError, syncCurrentUserTotpState, t, twoFaRecord])

  const close2faModal = useCallback(() => {
    setTwoFaOpen(false)
    setTwoFaRecord(null)
    setTwoFaSetup(null)
    setTwoFaCode('')
  }, [])

  return {
    twoFaOpen,
    twoFaLoading,
    twoFaRecord,
    twoFaSetup,
    twoFaCode,
    twoFaSetupLoading,
    twoFaEnableLoading,
    twoFaDisableLoading,
    setTwoFaCode,
    open2faModal,
    handleGenerate2fa,
    handleEnable2fa,
    handleDisable2fa,
    close2faModal,
  }
}
