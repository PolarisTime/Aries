import { useCallback, useState } from 'react'
import {
  changeOwnPassword,
  disableOwn2fa,
  enableOwn2fa,
  setupOwn2fa,
} from '@/api/account-security'
import type { TotpSetupResponse } from '@/types/auth'
import { message } from '@/utils/antd-app'

type PasswordFormValues = {
  oldPassword: string
  newPassword: string
}

type UseAccountSecurityResult = {
  passwordSaving: boolean
  twoFactorSetupLoading: boolean
  twoFactorEnableLoading: boolean
  twoFactorDisableLoading: boolean
  handleChangePassword: (values: PasswordFormValues) => Promise<void>
  handleSetup2fa: () => Promise<TotpSetupResponse | undefined>
  handleEnable2fa: (totpCode: string) => Promise<void>
  handleDisable2fa: (totpCode: string) => Promise<void>
}

export function useAccountSecurity(): UseAccountSecurityResult {
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [twoFactorSetupLoading, setTwoFactorSetupLoading] = useState(false)
  const [twoFactorEnableLoading, setTwoFactorEnableLoading] = useState(false)
  const [twoFactorDisableLoading, setTwoFactorDisableLoading] = useState(false)

  const handleChangePassword = useCallback(
    async (values: PasswordFormValues): Promise<void> => {
      setPasswordSaving(true)
      try {
        await changeOwnPassword({
          currentPassword: values.oldPassword,
          newPassword: values.newPassword,
        })
        message.success('密码修改成功')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '密码修改失败')
      } finally {
        setPasswordSaving(false)
      }
    },
    [],
  )

  const handleSetup2fa = useCallback(async (): Promise<
    TotpSetupResponse | undefined
  > => {
    setTwoFactorSetupLoading(true)
    try {
      return (await setupOwn2fa()).data
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取2FA设置失败')
    } finally {
      setTwoFactorSetupLoading(false)
    }
  }, [])

  const handleEnable2fa = useCallback(
    async (totpCode: string): Promise<void> => {
      setTwoFactorEnableLoading(true)
      try {
        await enableOwn2fa(totpCode)
        message.success('二次验证已启用')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '启用2FA失败')
      } finally {
        setTwoFactorEnableLoading(false)
      }
    },
    [],
  )

  const handleDisable2fa = useCallback(
    async (totpCode: string): Promise<void> => {
      setTwoFactorDisableLoading(true)
      try {
        await disableOwn2fa(totpCode)
        message.success('二次验证已禁用')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '禁用2FA失败')
      } finally {
        setTwoFactorDisableLoading(false)
      }
    },
    [],
  )

  return {
    passwordSaving,
    twoFactorSetupLoading,
    twoFactorEnableLoading,
    twoFactorDisableLoading,
    handleChangePassword,
    handleSetup2fa,
    handleEnable2fa,
    handleDisable2fa,
  }
}
