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
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const addSettlementAccount = useCallback(() => {
    setSettlementAccounts((prev) => [...prev, createEmptySettlementAccount()])
  }, [])

  const removeSettlementAccount = useCallback(
    (index: number) => {
      if (settlementAccounts.length <= 1) {
        message.warning(t('system.company.atLeastOneSettlementAccount'))
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
      message.warning(t('common.noPermission'))
      return
    }

    // Sync validation before async form validation
    if (!settlementAccounts.length) {
      message.warning(t('system.company.atLeastOneSettlementAccount'))
      return
    }
    for (let i = 0; i < settlementAccounts.length; i++) {
      const account = settlementAccounts[i]
      if (!account.accountName?.trim()) {
        message.warning(
          t('system.company.inputAccountName', { index: i + 1 }),
        )
        return
      }
      if (!account.bankName?.trim()) {
        message.warning(
          t('system.company.inputBankName', { index: i + 1 }),
        )
        return
      }
      if (!account.bankAccount?.trim()) {
        message.warning(
          t('system.company.inputBankAccount', { index: i + 1 }),
        )
        return
      }
    }
    const usedBankAccounts = new Set<string>()
    for (const account of settlementAccounts) {
      const bankAccount = account.bankAccount.trim()
      if (usedBankAccounts.has(bankAccount)) {
        message.warning(
          t('system.company.duplicateBankAccount', { account: bankAccount }),
        )
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
      {
        label: t('system.company.enterpriseMode'),
        value: t('system.company.singleEnterprise'),
      },
      {
        label: t('system.company.subjectStatus'),
        value: asString(getFormString(form, 'status')) || '--',
      },
      {
        label: t('system.company.settlementBanks'),
        value: t('system.company.countUnit', {
          count: settlementAccounts.length,
        }),
      },
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
          title={t('system.company.title')}
          description={t('system.company.lockedByOobe')}
        />
        {!canView && (
          <Alert
            type="warning"
            showIcon
            className="mb-24"
            title={t('common.noPermission')}
            description={t('system.company.noViewPermission')}
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
              title={t('system.company.supplementNote')}
            >
              <Form.Item name="remark" label={t('common.remark')}>
                <Input.TextArea
                  disabled={!canSave}
                  rows={4}
                  placeholder={t('system.company.subjectRemarkPlaceholder')}
                />
              </Form.Item>
            </Card>
          </Form>
        )}
      </Card>
    </div>
  )
}
