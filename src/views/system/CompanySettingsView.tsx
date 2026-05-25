import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from 'antd/es/alert'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Skeleton from 'antd/es/skeleton'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getCompanySettingProfile,
  saveCompanySettingProfile,
} from '@/api/company-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { getFormString, validateForm } from '@/lib/antd-form'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { CompanySettingsHeader } from '@/views/system/CompanySettingsHeader'
import { CompanySettlementAccountsCard } from '@/views/system/CompanySettlementAccountsCard'
import { CompanySubjectCard } from '@/views/system/CompanySubjectCard'
import {
  createEmptySettlementAccount,
  normalizeSettlementAccounts,
  type SettlementAccountFormRow,
} from '@/views/system/company-settings-view-utils'

type CompanySettingFormValues = {
  companyName: string
  taxNo: string
  status: string
  remark?: string
  [key: string]: unknown
}

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canView = permissionStore.can('company-setting', 'read')
  const canSave = permissionStore.can('company-setting', 'update')

  const [form] = Form.useForm()
  const [settlementAccounts, setSettlementAccounts] = useState<
    SettlementAccountFormRow[]
  >([createEmptySettlementAccount()])
  const [initialized, setInitialized] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.companySetting,
    queryFn: getCompanySettingProfile,
    enabled: canView,
  })

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        id: profile.id,
        companyName: profile.companyName,
        taxNo: profile.taxNo,
        status: profile.status || '正常',
        remark: profile.remark || '',
      })
      setSettlementAccounts(
        normalizeSettlementAccounts(profile.settlementAccounts),
      )
      setInitialized(true)
    }
  }, [profile, form])

  const saveMutation = useMutation({
    mutationFn: saveCompanySettingProfile,
    onSuccess: (data) => {
      if (data) {
        form.setFieldsValue({
          id: data.id,
          companyName: data.companyName,
          taxNo: data.taxNo,
          status: data.status,
          remark: data.remark || '',
        })
        setSettlementAccounts(
          normalizeSettlementAccounts(data.settlementAccounts),
        )
      }
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companySetting })
    },
    onError: (err: Error) => showError(err, '保存公司信息失败'),
  })

  const addSettlementAccount = useCallback(() => {
    setSettlementAccounts((prev) => [...prev, createEmptySettlementAccount()])
  }, [])

  const removeSettlementAccount = useCallback(
    (index: number) => {
      if (settlementAccounts.length <= 1) {
        message.warning('至少需要保留一个结算账户')
        return
      }
      setSettlementAccounts((prev) => prev.filter((_, i) => i !== index))
    },
    [settlementAccounts.length],
  )

  const updateSettlementAccount = useCallback(
    (index: number, field: keyof SettlementAccountFormRow, value: string) => {
      setSettlementAccounts((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      )
    },
    [],
  )

  const handleSave = useCallback(async () => {
    if (!canSave) {
      message.warning('暂无保存权限')
      return
    }

    // Sync validation before async form validation
    if (!settlementAccounts.length) {
      message.warning('请至少维护一个结算账户')
      return
    }
    for (let i = 0; i < settlementAccounts.length; i++) {
      const account = settlementAccounts[i]
      if (!account.accountName?.trim()) {
        message.warning(`请输入第 ${i + 1} 个结算账户的账户名称`)
        return
      }
      if (!account.bankName?.trim()) {
        message.warning(`请输入第 ${i + 1} 个结算账户的开户银行`)
        return
      }
      if (!account.bankAccount?.trim()) {
        message.warning(`请输入第 ${i + 1} 个结算账户的银行账号`)
        return
      }
    }
    const usedBankAccounts = new Set<string>()
    for (const account of settlementAccounts) {
      const bankAccount = account.bankAccount.trim()
      if (usedBankAccounts.has(bankAccount)) {
        message.warning(`银行账号重复：${bankAccount}`)
        return
      }
      usedBankAccounts.add(bankAccount)
    }

    try {
      const values = await validateForm<CompanySettingFormValues>(form, [
        'companyName',
        'taxNo',
        'status',
        'remark',
      ])
      saveMutation.mutate({
        companyName: values.companyName.trim(),
        taxNo: values.taxNo.trim(),
        settlementAccounts: settlementAccounts.map((account) => ({
          id:
            account.id == null || account.id === ''
              ? undefined
              : String(account.id),
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
    } catch {
      /* validation failed */
    }
  }, [canSave, form, settlementAccounts, saveMutation])

  const overviewItems = useMemo(
    () => [
      { label: '企业模式', value: '单企业' },
      {
        label: '主体状态',
        value: asString(getFormString(form, 'status')) || '--',
      },
      { label: '结算银行', value: `${settlementAccounts.length} 个` },
    ],
    [form, settlementAccounts],
  )

  return (
    <div className="page-stack">
      <CompanySettingsHeader
        loading={isLoading}
        canSave={canSave}
        saving={saveMutation.isPending}
        overviewItems={overviewItems}
        // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Antd Modal onOk pattern
        onRefresh={() =>
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.companySetting,
          })
        }
        onSave={() => {
          void handleSave()
        }}
      />

      <Card>
        <Alert
          type="info"
          showIcon
          className="mb-24"
          title="公司主体信息"
          description={
            '公司名称和税号由 OOBE 脚本初始化后锁定；默认税率已迁移到"通用设置"，本页只维护公司主体和结算银行信息。'
          }
        />
        {!canView && (
          <Alert
            type="warning"
            showIcon
            className="mb-24"
            title="暂无查看权限"
            description="当前账号没有公司信息查看权限。"
          />
        )}
        {isLoading && !initialized ? (
          <Skeleton active />
        ) : (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <CompanySubjectCard
                  form={form}
                  canSave={canSave}
                  settlementAccountCount={settlementAccounts.length}
                />
              </Col>
              <Col span={16}>
                <CompanySettlementAccountsCard
                  canSave={canSave}
                  settlementAccounts={settlementAccounts}
                  onAdd={addSettlementAccount}
                  onRemove={removeSettlementAccount}
                  onUpdate={updateSettlementAccount}
                />
              </Col>
            </Row>
            <Card
              size="small"
              className="mt-16 bg-secondary rounded-lg"
              title="补充说明"
            >
              <Form.Item name="remark" label="备注">
                <Input.TextArea
                  disabled={!canSave}
                  rows={4}
                  placeholder="补充主体抬头、结算习惯或财务说明"
                />
              </Form.Item>
            </Card>
          </Form>
        )}
      </Card>
    </div>
  )
}
