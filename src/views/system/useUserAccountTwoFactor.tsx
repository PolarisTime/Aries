import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import {
  disableUserAccount2fa,
  enableUserAccount2fa,
  getUserAccountDetail,
  setupUserAccount2fa,
} from '@/api/user-accounts'
import { useRequestError } from '@/hooks/useRequestError'
import { syncCurrentUserTotpStateById } from '@/stores/auth-user-sync'
import { useAuthStore } from '@/stores/authStore'
import type { TotpSetupResponse } from '@/types/auth'
import type { UserAccountRecord } from '@/types/user-account'
import { message, modal } from '@/utils/antd-app'

export function useUserAccountTwoFactor() {
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
    queryClient.invalidateQueries({ queryKey: ['user-account'] })
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
        showError(error, '加载 2FA 信息失败')
        setTwoFaOpen(false)
      } finally {
        setTwoFaLoading(false)
      }
    },
    [showError],
  )

  const handleGenerate2fa = useCallback(async () => {
    if (!twoFaRecord) return
    setTwoFaSetupLoading(true)
    try {
      const response = await setupUserAccount2fa(twoFaRecord.id)
      setTwoFaSetup(response.data)
      setTwoFaCode('')
      message.success(response.message || '二维码生成成功')
    } catch (error) {
      showError(error, '二维码生成失败')
    } finally {
      setTwoFaSetupLoading(false)
    }
  }, [showError, twoFaRecord])

  const handleEnable2fa = useCallback(async () => {
    if (!twoFaRecord) return
    if (!/^\d{6}$/.test(twoFaCode.trim())) {
      message.warning('请输入 6 位动态验证码')
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
      message.success(response.message || '2FA 已启用')
      setTwoFaOpen(false)
      refreshUsers()
    } catch (error) {
      showError(error, '启用 2FA 失败')
    } finally {
      setTwoFaEnableLoading(false)
    }
  }, [
    refreshUsers,
    showError,
    syncCurrentUserTotpState,
    twoFaCode,
    twoFaRecord,
  ])

  const handleDisable2fa = useCallback(() => {
    if (!twoFaRecord) return
    modal.confirm({
      title: '关闭二次验证',
      content: `确定关闭用户「${twoFaRecord.loginName}」的 2FA 吗？`,
      okText: '确认关闭',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setTwoFaDisableLoading(true)
        try {
          const response = await disableUserAccount2fa(twoFaRecord.id)
          setTwoFaRecord(response.data)
          syncCurrentUserTotpState(response.data)
          setTwoFaSetup(null)
          setTwoFaCode('')
          message.success(response.message || '2FA 已关闭')
          setTwoFaOpen(false)
          refreshUsers()
        } catch (error) {
          showError(error, '关闭 2FA 失败')
        } finally {
          setTwoFaDisableLoading(false)
        }
      },
    })
  }, [refreshUsers, showError, syncCurrentUserTotpState, twoFaRecord])

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
