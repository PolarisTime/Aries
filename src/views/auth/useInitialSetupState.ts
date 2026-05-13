import { useNavigate } from '@tanstack/react-router'
import Form from 'antd/es/form'
import { useCallback, useEffect, useState } from 'react'
import {
  getInitialSetupStatus,
  setupInitialAdmin2fa,
  submitInitialAdmin,
  submitInitialCompany,
} from '@/api/setup'
import type { InitialSetupStatus, InitialSetupTotpResult } from '@/types/setup'
import { asString } from '@/utils/type-narrowing'
import { message } from '@/utils/antd-app'

export type SetupStep = 'admin' | 'company'

interface AdminFormValues {
  adminLoginName: string
  adminPassword: string
  adminConfirmPassword: string
  adminUserName: string
  totpCode: string
}

interface CompanyFormValues {
  companyName: string
  taxNo: string
  bankName: string
  bankAccount: string
  taxRate: number
  remark: string
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败'
}

export function useInitialSetupState() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [status, setStatus] = useState<InitialSetupStatus | null>(null)
  const [currentStep, setCurrentStep] = useState<SetupStep>('admin')
  const [adminCompleted, setAdminCompleted] = useState(false)
  const [totpSetup, setTotpSetup] = useState<InitialSetupTotpResult | null>(null)
  const [loadingTotp, setLoadingTotp] = useState(false)
  const [loadingAdmin, setLoadingAdmin] = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [form] = Form.useForm()

  const loadStatus = useCallback(async () => {
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
        message.info('系统已完成初始化，即将跳转登录页')
        setTimeout(() => { void navigate({ to: '/login' }) }, 1500)
      }
    } catch {
      message.error('获取初始化状态失败')
    } finally {
      setChecking(false)
    }
  }, [navigate])

  // mount-time data fetch — setState is unavoidable for async init
  useEffect(() => { void loadStatus() }, [])
   

  const handleGenerateTotp = useCallback(async () => {
    const loginName = asString(form.getFieldValue('adminLoginName')).trim()
    if (!loginName) {
      message.error('请先输入管理员登录名')
      return
    }
    setLoadingTotp(true)
    try {
      const res = await setupInitialAdmin2fa({ loginName })
      setTotpSetup(res.data)
      message.success('TOTP 密钥已生成')
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingTotp(false)
    }
  }, [form])

  const handleSubmitAdmin = useCallback(async () => {
    try {
      const values = (await form.validateFields([
        'adminLoginName', 'adminPassword', 'adminConfirmPassword',
        'adminUserName', 'totpCode',
      ])) as unknown as AdminFormValues

      if (values.adminPassword !== values.adminConfirmPassword) {
        message.error('两次密码输入不一致')
        return
      }
      if (!totpSetup?.secret) {
        message.error('请先生成TOTP')
        return
      }
      setLoadingAdmin(true)
      const res = await submitInitialAdmin({
        admin: {
          loginName: values.adminLoginName.trim(),
          password: values.adminPassword,
          userName: (values.adminUserName || '系统管理员').trim(),
        },
        totpSecret: totpSetup.secret,
        totpCode: values.totpCode.trim(),
      })
      message.success(res.message || '管理员创建成功')
      setAdminCompleted(true)
      setCurrentStep('company')
      void loadStatus()
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingAdmin(false)
    }
  }, [form, loadStatus, totpSetup])

  const handleSubmitCompany = useCallback(async () => {
    try {
      const values = (await form.validateFields([
        'companyName', 'taxNo', 'bankName', 'bankAccount',
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
      message.success(res.message || '公司信息初始化完成')
      void navigate({ to: '/login' })
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoadingCompany(false)
    }
  }, [form, navigate])

  return {
    adminCompleted, checking, currentStep, form,
    handleGenerateTotp, handleSubmitAdmin, handleSubmitCompany,
    loadingAdmin, loadingCompany, loadingTotp, setCurrentStep,
    status, totpSetup,
  }
}
