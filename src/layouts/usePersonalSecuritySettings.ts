import Form from 'antd/es/form'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  changeOwnPassword,
  enableOwn2fa,
  setupOwn2fa,
} from '@/api/account-security'
import { syncCurrentUserTotpState } from '@/stores/auth-user-sync'
import type { TotpSetupResponse } from '@/types/auth'
import { message } from '@/utils/antd-app'

interface Props {
  open: boolean
  tab: string
}

type PasswordFormValues = {
  oldPassword: string
  newPassword: string
}

type UsePersonalSecuritySettingsResult = {
  handleChangePassword: (values: PasswordFormValues) => Promise<void>
  handleEnableTotp: () => Promise<void>
  handleSetupTotp: () => Promise<void>
  pwForm: ReturnType<typeof Form.useForm<PasswordFormValues>>[0]
  pwSaving: boolean
  resetSecurityState: () => void
  totpCode: string
  totpEnabling: boolean
  totpLoading: boolean
  totpSetup: TotpSetupResponse | null
  setTotpCode: (value: string) => void
}

export function usePersonalSecuritySettings({
  open,
  tab,
}: Props): UsePersonalSecuritySettingsResult {
  const { t } = useTranslation()
  const [pwForm] = Form.useForm<PasswordFormValues>()
  const [pwSaving, setPwSaving] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpSetup, setTotpSetup] = useState<TotpSetupResponse | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabling, setTotpEnabling] = useState(false)

  useEffect(() => {
    if (!open || tab !== 'security') {
      return
    }
    pwForm.resetFields()
  }, [open, pwForm, tab])

  const resetSecurityState = (): void => {
    setTotpSetup(null)
    setTotpCode('')
  }

  const handleChangePassword = async (
    values: PasswordFormValues,
  ): Promise<void> => {
    setPwSaving(true)
    try {
      await changeOwnPassword({
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      message.success(t('auth.personalsecurity.passwordSuccess'))
      pwForm.resetFields()
      setPwSaving(false)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('auth.personalsecurity.passwordFailed'),
      )
      setPwSaving(false)
    }
  }

  const handleSetupTotp = async (): Promise<void> => {
    setTotpLoading(true)
    try {
      setTotpSetup((await setupOwn2fa()).data)
      setTotpLoading(false)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('auth.personalsecurity.setupFailed'),
      )
      setTotpLoading(false)
    }
  }

  const handleEnableTotp = async (): Promise<void> => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error(t('auth.personalsecurity.codeInvalid'))
      return
    }

    setTotpEnabling(true)
    try {
      await enableOwn2fa(totpCode.trim())
      syncCurrentUserTotpState(true)
      message.success(t('auth.personalsecurity.enableSuccess'))
      resetSecurityState()
      setTotpEnabling(false)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('auth.personalsecurity.enableFailed'),
      )
      setTotpEnabling(false)
    }
  }

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
