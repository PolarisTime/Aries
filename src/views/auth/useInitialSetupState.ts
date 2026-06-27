import { useNavigate } from '@tanstack/react-router'
import { Form } from 'antd'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getInitialSetupStatus,
  setupInitialAdmin2fa,
  submitInitialAdmin,
  submitInitialCompany,
} from '@/api/setup'
import type { InitialSetupStatus, InitialSetupTotpResult } from '@/types/setup'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'

export type SetupStep = 'admin' | 'company'

type AdminFormValues = {
  adminLoginName: string
  adminPassword: string
  adminConfirmPassword: string
  adminUserName: string
  totpCode: string
}

type CompanyFormValues = {
  companyName: string
  taxNo: string
  bankName: string
  bankAccount: string
  taxRate: number
  remark: string
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export function useInitialSetupState() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState<InitialSetupStatus | null>(null)
  const [currentStep, setCurrentStep] = useState<SetupStep>('admin')
  const [adminCompleted, setAdminCompleted] = useState(false)
  const [totpSetup, setTotpSetup] = useState<InitialSetupTotpResult | null>(
    null,
  )
  const [loadingTotp, setLoadingTotp] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [form] = Form.useForm()

  const loadStatus = async () => {
    try {
      const res = await getInitialSetupStatus()
      const s = res.data
      setStatus(s)
      if (s.adminConfigured && !s.companyConfigured) {
        setAdminCompleted(true)
        setCurrentStep('company')
      } else if (!s.adminConfigured) {
        setAdminCompleted(false)
        setCurrentStep('admin')
      }
      if (!s.setupRequired) {
        message.info(t('auth.initialsetup.alreadyCompletedRedirect'))
        setTimeout(() => {
          void navigate({ to: '/login' })
        }, 1500)
      }
      setChecking(false)
    } catch {
      message.error(t('auth.initialsetup.loadStatusFailed'))
      setChecking(false)
    }
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
        if (s.adminConfigured && !s.companyConfigured) {
          setAdminCompleted(true)
          setCurrentStep('company')
        } else if (!s.adminConfigured) {
          setAdminCompleted(false)
          setCurrentStep('admin')
        }
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

  const handleGenerateTotp = async () => {
    const loginName = asString(form.getFieldValue('adminLoginName')).trim()
    if (!loginName) {
      message.error(t('auth.initialsetup.inputAdminLoginFirst'))
      return
    }
    setLoadingTotp(true)
    try {
      const res = await setupInitialAdmin2fa({ loginName })
      setTotpSetup(res.data)
      message.success(t('auth.initialsetup.totpGenerated'))
      setLoadingTotp(false)
    } catch (error) {
      message.error(
        getErrorMessage(error, t('auth.initialsetup.operationFailed')),
      )
      setLoadingTotp(false)
    }
  }

  const handleSubmitAdmin = async () => {
    try {
      const values = (await form.validateFields([
        'adminLoginName',
        'adminPassword',
        'adminConfirmPassword',
        'adminUserName',
        'totpCode',
      ])) as unknown as AdminFormValues

      if (values.adminPassword !== values.adminConfirmPassword) {
        message.error(t('auth.initialsetup.passwordMismatch'))
        return
      }
      if (!totpSetup?.secret) {
        message.error(t('auth.initialsetup.totpRequired'))
        return
      }
      setLoadingAdmin(true)
      const res = await submitInitialAdmin({
        admin: {
          loginName: values.adminLoginName.trim(),
          password: values.adminPassword,
          userName: (
            values.adminUserName || t('auth.initialsetup.defaultAdminUserName')
          ).trim(),
        },
        totpSecret: totpSetup.secret,
        totpCode: values.totpCode.trim(),
      })
      message.success(res.message || t('auth.initialsetup.adminCreateSuccess'))
      setAdminCompleted(true)
      setCurrentStep('company')
      void loadStatus()
      setLoadingAdmin(false)
    } catch (error) {
      message.error(
        getErrorMessage(error, t('auth.initialsetup.operationFailed')),
      )
      setLoadingAdmin(false)
    }
  }

  const handleSubmitCompany = async () => {
    try {
      const values = (await form.validateFields([
        'companyName',
        'taxNo',
        'bankName',
        'bankAccount',
      ])) as unknown as CompanyFormValues

      setLoadingCompany(true)
      const res = await submitInitialCompany({
        companyName: values.companyName.trim(),
        taxNo: values.taxNo.trim(),
        bankName: values.bankName.trim(),
        bankAccount: values.bankAccount.trim(),
        taxRate: values.taxRate || 0.13,
        remark: values.remark?.trim() || '',
      })
      message.success(
        res.message || t('auth.initialsetup.companyCreateSuccess'),
      )
      void navigate({ to: '/login' })
      setLoadingCompany(false)
    } catch (error) {
      message.error(
        getErrorMessage(error, t('auth.initialsetup.operationFailed')),
      )
      setLoadingCompany(false)
    }
  }

  return {
    adminCompleted,
    checking,
    currentStep,
    form,
    handleGenerateTotp,
    handleSubmitAdmin,
    handleSubmitCompany,
    loadingAdmin,
    loadingCompany,
    loadingTotp,
    setCurrentStep,
    status,
    totpSetup,
  }
}
