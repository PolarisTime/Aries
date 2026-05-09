import { Form } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { syncCurrentUserTotpState } from '@/stores/auth-user-sync'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'

interface TotpSetupState {
  qrCodeBase64: string
  secret: string
}

interface Props {
  open: boolean
  tab: string
}

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
}

export function usePersonalSecuritySettings({ open, tab }: Props) {
  const [pwForm] = Form.useForm<PasswordFormValues>()
  const [pwSaving, setPwSaving] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpSetup, setTotpSetup] = useState<TotpSetupState | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabling, setTotpEnabling] = useState(false)

  useEffect(() => {
    if (!open || tab !== 'security') {
      return
    }
    pwForm.resetFields()
  }, [open, pwForm, tab])

  const resetSecurityState = useCallback(() => {
    setTotpSetup(null)
    setTotpCode('')
  }, [])

  const handleChangePassword = useCallback(
    async (values: PasswordFormValues) => {
      setPwSaving(true)
      try {
        await http.post(ENDPOINTS.ACCOUNT_PASSWORD, values)
        message.success('密码修改成功')
        pwForm.resetFields()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '修改失败')
      } finally {
        setPwSaving(false)
      }
    },
    [pwForm],
  )

  const handleSetupTotp = useCallback(async () => {
    setTotpLoading(true)
    try {
      const response = await http.post<
        ApiResponse<{ qrCodeBase64: string; secret: string }>
      >(ENDPOINTS.ACCOUNT_2FA_SETUP, {})
      setTotpSetup(response.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取失败')
    } finally {
      setTotpLoading(false)
    }
  }, [])

  const handleEnableTotp = useCallback(async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error('请输入 6 位验证码')
      return
    }

    setTotpEnabling(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, {
        totpCode: totpCode.trim(),
      })
      syncCurrentUserTotpState(true)
      message.success('二次验证已启用')
      resetSecurityState()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '启用失败')
    } finally {
      setTotpEnabling(false)
    }
  }, [resetSecurityState, totpCode])

  return {
    handleChangePassword,
    handleEnableTotp,
    handleSetupTotp,
    pwForm,
    pwSaving,
    resetSecurityState,
    totpCode,
    totpEnabling,
    totpLoading,
    totpSetup,
    setTotpCode,
  }
}
