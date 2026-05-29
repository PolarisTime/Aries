import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from 'antd/es/alert'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Skeleton from 'antd/es/skeleton'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  getCompanySettingProfile,
  saveCompanySettingProfile,
} from '@/api/company-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { QUERY_KEYS } from '@/constants/query-keys'
import { validateForm } from '@/lib/antd-form'
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

function buildCompanySettingFormValues(
  profile: CompanySettingProfile | null,
): CompanySettingFormValues {
  return {
    id: profile?.id,
    companyName: profile?.companyName ?? '',
    taxNo: profile?.taxNo ?? '',
    status: profile?.status || '正常',
    remark: profile?.remark || '',
  }
}

interface CompanySettingsFormProps {
  canView: boolean
  canSave: boolean
  isLoading: boolean
  profile: CompanySettingProfile | null
  onRefresh: () => void
}

function CompanySettingsForm({
  canView,
  canSave,
  isLoading,
  profile,
  onRefresh,
}: CompanySettingsFormProps) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const [form] = Form.useForm()
  const initialValues = buildCompanySettingFormValues(profile)
  const statusValue = Form.useWatch('status', form)
  const [settlementAccounts, setSettlementAccounts] = useState<
    SettlementAccountFormRow[]
  >(() => normalizeSettlementAccounts(profile?.settlementAccounts))

  const saveMutation = useMutation({
    mutationFn: saveCompanySettingProfile,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(QUERY_KEYS.companySetting, data)
      }
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companySetting })
    },
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const addSettlementAccount = () => {
    setSettlementAccounts((prev) => [...prev, createEmptySettlementAccount()])
  }

  const removeSettlementAccount = (index: number) => {
    if (settlementAccounts.length <= 1) {
      message.warning(t('system.company.atLeastOneSettlementAccount'))
      return
    }
    setSettlementAccounts((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSettlementAccount = (
    index: number,
    field: keyof SettlementAccountFormRow,
    value: string,
  ) => {
    setSettlementAccounts((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  const handleSave = async () => {
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
  }

  const overviewItems = [
    {
      label: t('system.company.enterpriseMode'),
      value: t('system.company.singleEnterprise'),
    },
    {
      label: t('system.company.subjectStatus'),
      value: asString(statusValue ?? initialValues.status) || '--',
    },
    {
      label: t('system.company.settlementBanks'),
      value: t('system.company.countUnit', {
        count: settlementAccounts.length,
      }),
    },
  ]

  return (
    <div className="page-stack">
      <CompanySettingsHeader
        loading={isLoading}
        canSave={canSave}
        saving={saveMutation.isPending}
        overviewItems={overviewItems}
        onRefresh={onRefresh}
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
        {isLoading ? (
          <Skeleton active />
        ) : (
          <Form form={form} layout="vertical" initialValues={initialValues}>
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

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const permissionStore = usePermissionStore()
  const canView = permissionStore.can('company-setting', 'read')
  const canSave = permissionStore.can('company-setting', 'update')

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.companySetting,
    queryFn: getCompanySettingProfile,
    enabled: canView,
  })

  const profileVersion = canView ? profileQuery.dataUpdatedAt : 'no-view'

  return (
    <CompanySettingsForm
      key={profileVersion}
      canView={canView}
      canSave={canSave}
      isLoading={profileQuery.isLoading}
      profile={profileQuery.data ?? null}
      onRefresh={() => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.companySetting,
        })
      }}
    />
  )
}
