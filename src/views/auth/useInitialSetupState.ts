import { useNavigate } from '@tanstack/react-router'
import { Form } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { submitInitialAccount } from '@/api/system/setup'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import type { InitialSetupStatus } from '@/shared/schemas'
import { useSetupStore } from '@/stores/setupStore'
import type { RuntimeConfigResponse } from '@/types/runtime-config'
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
  const status = useSetupStore((state) => state.status)
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
      await submitInitialAccount(
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
      message.success(t('auth.initialsetup.accountCreateSuccess'))
      const completedStatus: InitialSetupStatus = {
        setupRequired: false,
        accountConfigured: true,
      }
      useSetupStore.getState().setStatus(completedStatus)
      queryClient.setQueryData<RuntimeConfigResponse>(
        QUERY_KEYS.runtimeConfig,
        (current) =>
          current ? { ...current, setup: completedStatus } : current,
      )
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
    checking: status === null,
    form,
    handleSubmitAccount,
    loadingAccount,
    status,
  }
}
