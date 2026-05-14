import { useNavigate } from '@tanstack/react-router'
import Form from 'antd/es/form'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { enableOwn2fa, setupOwn2fa } from '@/api/account-security'
import { syncCurrentUserTotpState } from '@/stores/auth-user-sync'
import type { TotpSetupResponse } from '@/types/auth'
import { message } from '@/utils/antd-app'

type TotpCodeFormValues = {
  totpCode: string
}

type UseSetupTwoFactorStateResult = {
  enabling: boolean
  fetchTotpSetup: () => Promise<void>
  form: ReturnType<typeof Form.useForm<TotpCodeFormValues>>[0]
  handleEnable: (values: TotpCodeFormValues) => Promise<void>
  loading: boolean
  totpData: TotpSetupResponse | null
}

export function useSetupTwoFactorState(): UseSetupTwoFactorStateResult {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [totpData, setTotpData] = useState<TotpSetupResponse | null>(null)
  const [form] = Form.useForm<TotpCodeFormValues>()

  const resolveRedirectTarget = useCallback((): string => {
    if (typeof window === 'undefined') {
      return '/dashboard'
    }

    const redirect =
      new URLSearchParams(window.location.search).get('redirect') ||
      '/dashboard'
    if (!redirect.startsWith('/') || /^https?:\/\//i.test(redirect)) {
      return '/dashboard'
    }
    return redirect
  }, [])

  const fetchTotpSetup = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      setTotpData((await setupOwn2fa()).data)
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('auth.setup2fa.content.loadFailed'),
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchTotpSetup()
  }, [fetchTotpSetup])

  const handleEnable = useCallback(
    async (values: TotpCodeFormValues): Promise<void> => {
      try {
        setEnabling(true)
        await enableOwn2fa(values.totpCode)
        syncCurrentUserTotpState(true)
        message.success(t('auth.personalsecurity.enableSuccess'))
        setTimeout(() => {
          void navigate({ to: resolveRedirectTarget() as '/' })
        }, 300)
      } catch (error) {
        message.error(
          error instanceof Error
            ? error.message
            : t('auth.personalsecurity.enableFailed'),
        )
      } finally {
        setEnabling(false)
      }
    },
    [navigate, resolveRedirectTarget, t],
  )

  return {
    enabling,
    fetchTotpSetup,
    form,
    handleEnable,
    loading,
    totpData,
  }
}
