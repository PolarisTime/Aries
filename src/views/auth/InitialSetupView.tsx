import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, Steps, Form, Input, InputNumber, Button, message, Spin, QRCode } from 'antd'
import { UserOutlined, LockOutlined, BankOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { getInitialSetupStatus, setupInitialAdmin2fa, submitInitialAdmin, submitInitialCompany } from '@/api/setup'
import { appTitle } from '@/utils/env'
import type { InitialSetupStatus, InitialSetupTotpResult } from '@/types/setup'

type SetupStep = 'admin' | 'company'

export function InitialSetupView() {
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
      setStatus(res.data)
      if (!res.data.setupRequired) {
        message.info('系统已完成初始化，即将跳转登录页')
        setTimeout(() => navigate({ to: '/login' as '/' }), 1500)
      }
    } catch {
      message.error('获取初始化状态失败')
    } finally {
      setChecking(false)
    }
  }, [navigate])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleGenerateTotp = async () => {
    const loginName = form.getFieldValue('adminLoginName')?.trim()
    if (!loginName) { message.error('请先输入管理员登录名'); return }
    setLoadingTotp(true)
    try {
      const res = await setupInitialAdmin2fa({ loginName })
      setTotpSetup(res.data)
      message.success('TOTP 密钥已生成')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '生成2FA失败')
    } finally { setLoadingTotp(false) }
  }

  const handleSubmitAdmin = async () => {
    try {
      const values = await form.validateFields(['adminLoginName', 'adminPassword', 'adminConfirmPassword', 'adminUserName', 'totpCode'])
      if (values.adminPassword !== values.adminConfirmPassword) {
        message.error('两次密码输入不一致'); return
      }
      if (!totpSetup?.secret) { message.error('请先生成TOTP'); return }
      setLoadingAdmin(true)
      const res = await submitInitialAdmin({
        admin: { loginName: values.adminLoginName.trim(), password: values.adminPassword, userName: (values.adminUserName || '系统管理员').trim() },
        totpSecret: totpSetup.secret,
        totpCode: values.totpCode.trim(),
      })
      message.success(res.message || '管理员创建成功')
      setAdminCompleted(true)
      setCurrentStep('company')
      await loadStatus()
    } catch (err) { message.error(err instanceof Error ? err.message : '创建管理员失败') }
    finally { setLoadingAdmin(false) }
  }

  const handleSubmitCompany = async () => {
    try {
      const values = await form.validateFields(['companyName', 'taxNo', 'bankName', 'bankAccount'])
      setLoadingCompany(true)
      const res = await submitInitialCompany({
        companyName: values.companyName.trim(), taxNo: values.taxNo.trim(),
        bankName: values.bankName.trim(), bankAccount: values.bankAccount.trim(),
        taxRate: values.taxRate || 0.13, remark: values.remark?.trim() || '',
      })
      message.success(res.message || '公司信息初始化完成')
      navigate({ to: '/login' as '/' })
    } catch (err) { message.error(err instanceof Error ? err.message : '初始化公司失败') }
    finally { setLoadingCompany(false) }
  }

  if (checking) return <div className="flex items-center justify-center min-h-screen"><Spin size="large" tip="正在检查初始化状态..." /></div>
  if (status && !status.setupRequired) return (
    <div className="flex items-center justify-center min-h-screen">
      <Card><p className="text-green-600 text-lg">系统已完成初始化</p></Card>
    </div>
  )

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_26%),linear-gradient(135deg,#eef4fb_0%,#f8fafc_55%,#e8eff8_100%)]">
      <Card className="w-[min(100%,720px)]">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-[#0f172a]">{appTitle}</h1>
          <p className="text-[#64748b] mt-1">系统初始化向导</p>
        </div>
        <Steps
          current={currentStep === 'admin' ? 0 : 1}
          items={[{ title: '管理员配置' }, { title: '公司主体配置' }]}
          className="mb-6"
        />
        <Form form={form} layout="vertical" initialValues={{ adminUserName: '系统管理员', taxRate: 0.13 }}>
          {currentStep === 'admin' ? (
            <>
              <Form.Item name="adminLoginName" label="管理员登录名" rules={[{ required: true, message: '请输入登录名' }]}>
                <Input prefix={<UserOutlined />} placeholder="管理员登录名" autoFocus />
              </Form.Item>
              <Form.Item name="adminPassword" label="密码" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="至少6位" />
              </Form.Item>
              <Form.Item name="adminConfirmPassword" label="确认密码" rules={[{ required: true, message: '请确认密码' }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" />
              </Form.Item>
              <Form.Item name="adminUserName" label="管理员姓名">
                <Input prefix={<UserOutlined />} placeholder="系统管理员" />
              </Form.Item>
              <div className="mb-4">
                <Button icon={<SafetyCertificateOutlined />} loading={loadingTotp} onClick={handleGenerateTotp} block>
                  {totpSetup ? '重新生成 TOTP 密钥' : '生成 TOTP 密钥'}
                </Button>
              </div>
              {totpSetup && (
                <div className="text-center mb-4">
                  <QRCode value={totpSetup.qrCodeBase64 || totpSetup.secret} size={160} />
                  <p className="text-xs text-gray-500 mt-2">密钥: {totpSetup.secret}</p>
                </div>
              )}
              <Form.Item name="totpCode" label="TOTP验证码" rules={[{ required: true, pattern: /^\d{6}$/, message: '请输入6位验证码' }]}>
                <Input placeholder="6位TOTP验证码" maxLength={6} />
              </Form.Item>
              <Button type="primary" loading={loadingAdmin} onClick={handleSubmitAdmin} block size="large">
                创建管理员并继续
              </Button>
            </>
          ) : (
            <>
              {adminCompleted && <p className="text-green-600 mb-4">管理员账户已创建成功</p>}
              <Form.Item name="companyName" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
                <Input prefix={<BankOutlined />} placeholder="公司名称" autoFocus />
              </Form.Item>
              <Form.Item name="taxNo" label="税号" rules={[{ required: true, message: '请输入税号' }]}>
                <Input placeholder="税号" />
              </Form.Item>
              <Form.Item name="bankName" label="开户银行" rules={[{ required: true, message: '请输入开户银行' }]}>
                <Input placeholder="开户银行" />
              </Form.Item>
              <Form.Item name="bankAccount" label="银行账号" rules={[{ required: true, message: '请输入银行账号' }]}>
                <Input placeholder="银行账号" />
              </Form.Item>
              <Form.Item name="taxRate" label="税率">
                <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
              <div className="flex gap-2">
                <Button onClick={() => setCurrentStep('admin')}>上一步</Button>
                <Button type="primary" loading={loadingCompany} onClick={handleSubmitCompany} block>
                  完成初始化
                </Button>
              </div>
            </>
          )}
        </Form>
      </Card>
    </div>
  )
}
