import { useNavigate } from '@tanstack/react-router'
import { Form } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getInitialSetupStatus, submitInitialAccount } from '@/api/system/setup'
import type { InitialSetupStatus } from '@/shared/schemas'
import { useSetupStore } from '@/stores/setupStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

export const SETUP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}=?$/

type AccountFormValues = {
  accountLoginName: string
  accountPassword: string
  accountConfirmPassword: string
  accountUserName: string
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export function useInitialSetupState() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState<InitialSetupStatus | null>(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [form] = Form.useForm()

  const getValidSetupToken = (): string | null => {
    const setupToken = asString(form.getFieldValue('setupToken'))
    if (!setupToken) {
      message.error(t('auth.initialsetup.setupTokenRequired'))
      return null
    }
    if (!SETUP_TOKEN_PATTERN.test(setupToken)) {
      message.error(t('auth.initialsetup.setupTokenInvalid'))
      return null
    }
    return setupToken
  }

  useEffect(() => {
    let active = true
    let redirectTimer: ReturnType<typeof setTimeout> | null = null

    const loadInitialStatus = async () => {
      try {
        const res = await getInitialSetupStatus()
        if (!active) {
          return
        }
        const s = res.data
        setStatus(s)
        useSetupStore.getState().setStatus(s)
        if (!s.setupRequired) {
          message.info(t('auth.initialsetup.alreadyCompletedRedirect'))
          redirectTimer = setTimeout(() => {
            if (active) {
              void navigate({ to: '/login' })
            }
          }, 1500)
        }
        setChecking(false)
      } catch {
        if (!active) {
          return
        }
        message.error(t('auth.initialsetup.loadStatusFailed'))
        setChecking(false)
      }
    }

    void loadInitialStatus()

    return () => {
      active = false
      if (redirectTimer) {
        clearTimeout(redirectTimer)
      }
    }
  }, [navigate, t])

  const handleSubmitAccount = async () => {
    const setupToken = getValidSetupToken()
    if (!setupToken) {
      return
    }
    try {
      const values = (await form.validateFields([
        'setupToken',
        'accountLoginName',
        'accountPassword',
        'accountConfirmPassword',
        'accountUserName',
      ])) as unknown as AccountFormValues

      if (values.accountPassword !== values.accountConfirmPassword) {
        message.error(t('auth.initialsetup.passwordMismatch'))
        return
      }
      setLoadingAccount(true)
      const res = await submitInitialAccount(
        {
          account: {
            loginName: values.accountLoginName.trim(),
            password: values.accountPassword,
            userName: (
              values.accountUserName ||
              t('auth.initialsetup.defaultAccountUserName')
            ).trim(),
          },
        },
        setupToken,
      )
      message.success(
        res.message || t('auth.initialsetup.accountCreateSuccess'),
      )
      useSetupStore.getState().setStatus({ setupRequired: false })
      void navigate({ to: '/login' })
    } catch (error) {
      message.error(
        getErrorMessage(error, t('auth.initialsetup.operationFailed')),
      )
    } finally {
      setLoadingAccount(false)
    }
  }

  return {
    checking,
    form,
    handleSubmitAccount,
    loadingAccount,
    status,
  }
}
