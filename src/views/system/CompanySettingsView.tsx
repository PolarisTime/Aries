import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card, Button, Form, Input, Select, Space, Typography, message, Row, Col, Skeleton, Alert,
} from 'antd'
import {
  BankOutlined, DeleteOutlined, EditOutlined, IdcardOutlined,
  PlusOutlined, ReloadOutlined, SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCompanySettingProfile, saveCompanySettingProfile, type CompanySettlementAccount,
} from '@/api/company-settings'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'

interface SettlementAccountFormRow extends CompanySettlementAccount {
  localKey: string
}

let accountRowSeed = 0
function nextLocalKey() {
  accountRowSeed += 1
  return `settlement-account-${accountRowSeed}`
}

function createEmptySettlementAccount(): SettlementAccountFormRow {
  return {
    localKey: nextLocalKey(),
    accountName: '', bankName: '', bankAccount: '',
    usageType: '通用', status: '正常', remark: '',
  }
}

function normalizeSettlementAccounts(accounts: CompanySettlementAccount[] | undefined | null): SettlementAccountFormRow[] {
  if (!accounts?.length) return [createEmptySettlementAccount()]
  return accounts.map((account) => ({
    ...account,
    id: account.id == null || account.id === '' ? undefined : account.id,
    accountName: String(account.accountName || ''),
    bankName: String(account.bankName || ''),
    bankAccount: String(account.bankAccount || ''),
    usageType: String(account.usageType || '通用'),
    status: String(account.status || '正常'),
    remark: String(account.remark || ''),
    localKey: nextLocalKey(),
  }))
}

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canView = permissionStore.can('company-setting', 'read')
  const canSave = permissionStore.can('company-setting', 'update')

  const [form] = Form.useForm()
  const [settlementAccounts, setSettlementAccounts] = useState<SettlementAccountFormRow[]>([createEmptySettlementAccount()])
  const [initialized, setInitialized] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: getCompanySettingProfile,
    enabled: canView,
  })

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        id: profile.id, companyName: profile.companyName, taxNo: profile.taxNo,
        status: profile.status || '正常', remark: profile.remark || '',
      })
      setSettlementAccounts(normalizeSettlementAccounts(profile.settlementAccounts))
      setInitialized(true)
    }
  }, [profile, form])

  const saveMutation = useMutation({
    mutationFn: saveCompanySettingProfile,
    onSuccess: (data) => {
      if (data) {
        form.setFieldsValue({ id: data.id, companyName: data.companyName, taxNo: data.taxNo, status: data.status, remark: data.remark || '' })
        setSettlementAccounts(normalizeSettlementAccounts(data.settlementAccounts))
      }
      message.success('公司信息已保存')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
    },
    onError: (err: Error) => showError(err, '保存公司信息失败'),
  })

  const addSettlementAccount = useCallback(() => {
    setSettlementAccounts((prev) => [...prev, createEmptySettlementAccount()])
  }, [])

  const removeSettlementAccount = useCallback((index: number) => {
    if (settlementAccounts.length <= 1) { message.warning('至少需要保留一个结算账户'); return }
    setSettlementAccounts((prev) => prev.filter((_, i) => i !== index))
  }, [settlementAccounts.length])

  const updateSettlementAccount = useCallback((index: number, field: keyof SettlementAccountFormRow, value: string) => {
    setSettlementAccounts((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }, [])

  const handleSave = useCallback(async () => {
    if (!canSave) { message.warning('暂无保存权限'); return }
    try {
      const values = await form.validateFields()
      if (!settlementAccounts.length) { message.warning('请至少维护一个结算账户'); return }
      for (let i = 0; i < settlementAccounts.length; i++) {
        const account = settlementAccounts[i]
        if (!account.accountName?.trim()) { message.warning(`请输入第 ${i + 1} 个结算账户的账户名称`); return }
        if (!account.bankName?.trim()) { message.warning(`请输入第 ${i + 1} 个结算账户的开户银行`); return }
        if (!account.bankAccount?.trim()) { message.warning(`请输入第 ${i + 1} 个结算账户的银行账号`); return }
      }
      const usedBankAccounts = new Set<string>()
      for (const account of settlementAccounts) {
        const bankAccount = account.bankAccount.trim()
        if (usedBankAccounts.has(bankAccount)) { message.warning(`银行账号重复：${bankAccount}`); return }
        usedBankAccounts.add(bankAccount)
      }
      saveMutation.mutate({
        companyName: values.companyName.trim(),
        taxNo: values.taxNo.trim(),
        settlementAccounts: settlementAccounts.map((account) => ({
          id: account.id == null || account.id === '' ? undefined : String(account.id),
          accountName: account.accountName.trim(),
          bankName: account.bankName.trim(),
          bankAccount: account.bankAccount.trim(),
          usageType: account.usageType || '通用',
          status: account.status || '正常',
          remark: account.remark?.trim() || '',
        })),
        status: values.status || '正常',
        remark: values.remark?.trim() || '',
      })
    } catch { /* validation failed */ }
  }, [canSave, form, settlementAccounts, saveMutation])

  const overviewItems = useMemo(() => [
    { label: '企业模式', value: '单企业' },
    { label: '主体状态', value: form.getFieldValue('status') || '--' },
    { label: '结算银行', value: `${settlementAccounts.length} 个` },
  ], [form, settlementAccounts])

  return (
    <div className="page-stack">
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>公司信息</Typography.Title>
            <Typography.Text type="secondary">本系统按单企业模式运行，公司名称和税号由 OOBE 初始化写入；本页集中维护多个结算银行、状态和补充说明。</Typography.Text>
          </div>
          <Space>
            <Button size="small" loading={isLoading} icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['company-settings'] })}>刷新</Button>
            {canSave && <Button type="primary" size="small" loading={saveMutation.isPending} icon={<SaveOutlined />} onClick={handleSave}>保存</Button>}
          </Space>
        </div>
        <Row gutter={16}>
          {overviewItems.map((item) => (
            <Col span={8} key={item.label}>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, padding: '18px 20px', background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>{item.label}</div>
                <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600 }}>{item.value}</div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <Card>
        <Alert type="info" showIcon style={{ marginBottom: 24 }} message="公司主体信息" description={'公司名称和税号由 OOBE 脚本初始化后锁定；默认税率已迁移到"通用设置"，本页只维护公司主体和结算银行信息。'} />
        {!canView && <Alert type="warning" showIcon style={{ marginBottom: 24 }} message="暂无查看权限" description="当前账号没有公司信息查看权限。" />}
        {isLoading && !initialized ? <Skeleton active /> : (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small" style={{ background: '#fafafa', borderRadius: 12 }}>
                  <Typography.Title level={5}><EditOutlined /> 基础主体</Typography.Title>
                  <Form.Item name="companyName" label="公司名称" required><Input disabled placeholder="由 OOBE 初始化写入" /></Form.Item>
                  <Form.Item name="taxNo" label="税号" required><Input disabled placeholder="由 OOBE 初始化写入" /></Form.Item>
                  <Form.Item name="status" label="状态" required>
                    <Select disabled={!canSave} options={[{ label: '正常', value: '正常' }, { label: '禁用', value: '禁用' }]} />
                  </Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: 'linear-gradient(135deg, #e6f4ff 0%, #f6ffed 100%)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1677ff', color: '#fff', fontSize: 20 }}><IdcardOutlined /></div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{form.getFieldValue('companyName') || '公司主体待配置'}</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{form.getFieldValue('taxNo') || '税号待配置'} / 结算银行 {settlementAccounts.length} 个</div>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={16}>
                <Card size="small" style={{ background: '#fafafa', borderRadius: 12 }}
                  title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span><BankOutlined /> 结算信息</span>{canSave && <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addSettlementAccount}>新增银行</Button>}</div>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {settlementAccounts.map((account, index) => (
                      <div key={account.localKey} style={{ padding: 16, border: '1px solid #ebeef5', borderRadius: 12, background: '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Typography.Text strong>结算账户 {index + 1}</Typography.Text>
                          {canSave && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeSettlementAccount(index)}>删除</Button>}
                        </div>
                        <Row gutter={12}>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">账户名称 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div>
                            <Input value={account.accountName} disabled={!canSave} placeholder="如：基本户 / 收款户" onChange={(e) => updateSettlementAccount(index, 'accountName', e.target.value)} />
                          </Col>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">用途 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div>
                            <Select value={account.usageType} disabled={!canSave} style={{ width: '100%' }} onChange={(v) => updateSettlementAccount(index, 'usageType', v)}
                              options={[{ label: '通用', value: '通用' }, { label: '收款', value: '收款' }, { label: '付款', value: '付款' }]}
                            />
                          </Col>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">开户银行 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div>
                            <Input value={account.bankName} disabled={!canSave} placeholder="输入开户银行" onChange={(e) => updateSettlementAccount(index, 'bankName', e.target.value)} />
                          </Col>
                        </Row>
                        <Row gutter={12} style={{ marginTop: 8 }}>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">银行账号 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div>
                            <Input value={account.bankAccount} disabled={!canSave} placeholder="输入银行账号" onChange={(e) => updateSettlementAccount(index, 'bankAccount', e.target.value)} />
                          </Col>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">状态 <span style={{ color: '#ff4d4f' }}>*</span></Typography.Text></div>
                            <Select value={account.status} disabled={!canSave} style={{ width: '100%' }} onChange={(v) => updateSettlementAccount(index, 'status', v)}
                              options={[{ label: '正常', value: '正常' }, { label: '禁用', value: '禁用' }]}
                            />
                          </Col>
                          <Col span={8}>
                            <div style={{ marginBottom: 8 }}><Typography.Text type="secondary">备注</Typography.Text></div>
                            <Input value={account.remark} disabled={!canSave} placeholder="补充账户用途或说明" onChange={(e) => updateSettlementAccount(index, 'remark', e.target.value)} />
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
            <Card size="small" style={{ marginTop: 16, background: '#fafafa', borderRadius: 12 }} title="补充说明">
              <Form.Item name="remark" label="备注">
                <Input.TextArea disabled={!canSave} rows={4} placeholder="补充主体抬头、结算习惯或财务说明" />
              </Form.Item>
            </Card>
          </Form>
        )}
      </Card>
    </div>
  )
}
