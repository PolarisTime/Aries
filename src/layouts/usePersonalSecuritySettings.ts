import { useNavigate } from '@tanstack/react-router'
import { Form } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { changeOwnPassword } from '@/api/account-security'
import { useAuthStore } from '@/stores/authStore'
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
  pwForm: ReturnType<typeof Form.useForm<PasswordFormValues>>[0]
  pwSaving: boolean
}

export function usePersonalSecuritySettings({
  open,
  tab,
}: Props): UsePersonalSecuritySettingsResult {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signOut = useAuthStore((state) => state.signOut)
  const [pwForm] = Form.useForm<PasswordFormValues>()
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (!open || tab !== 'security') {
      return
    }
    pwForm.resetFields()
  }, [open, pwForm, tab])

  const handleChangePassword = async (
    values: PasswordFormValues,
  ): Promise<void> => {
    setPwSaving(true)
    try {
      await changeOwnPassword({
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('auth.personalsecurity.passwordFailed'),
      )
      setPwSaving(false)
      return
    }

    message.success(t('auth.personalsecurity.passwordSuccess'))
    pwForm.resetFields()
    setPwSaving(false)
    await signOut()
    void navigate({ to: '/login' })
  }

  return {
    handleChangePassword,
    pwForm,
    pwSaving,
  }
}
