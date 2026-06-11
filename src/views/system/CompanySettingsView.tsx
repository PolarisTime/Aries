import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from 'antd/es/alert'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Skeleton from 'antd/es/skeleton'
import { useTranslation } from 'react-i18next'
import {
  type CompanySettingProfile,
  getCompanySettingProfile,
  saveCompanySettingProfile,
} from '@/api/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'
import { useRequestError } from '@/hooks/useRequestError'
import { validateForm } from '@/lib/antd-form'
import { usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import { CompanySettingsHeader } from '@/views/system/CompanySettingsHeader'
import { CompanySettlementAccountsCard } from '@/views/system/CompanySettlementAccountsCard'
import { CompanySubjectCard } from '@/views/system/CompanySubjectCard'
import {
  normalizeSettlementAccounts,
  type SettlementAccountFormRow,
} from '@/views/system/company-settings-view-utils'

type CompanySettingFormValues = {
  companyName: string
  taxNo: string
  status: string
  remark?: string
  settlementAccounts: SettlementAccountFormRow[]
  [key: string]: unknown
}

function buildCompanySettingFormValues(
  profile: CompanySettingProfile | null,
): CompanySettingFormValues {
  return {
    id: profile?.id,
    companyName: profile?.companyName ?? '',
    taxNo: profile?.taxNo ?? '',
    status: profile?.status || STATUS.NORMAL,
    remark: profile?.remark || '',
    settlementAccounts: normalizeSettlementAccounts(
      profile?.settlementAccounts,
    ),
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
  const [form] = Form.useForm<CompanySettingFormValues>()
  const initialValues = buildCompanySettingFormValues(profile)
  const statusValue = Form.useWatch('status', form)
  const watchedSettlementAccounts = Form.useWatch('settlementAccounts', form)
  const settlementAccountCount = Array.isArray(watchedSettlementAccounts)
    ? watchedSettlementAccounts.length
    : initialValues.settlementAccounts.length

  const saveMutation = useMutation({
    mutationFn: saveCompanySettingProfile,
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(QUERY_KEYS.companySetting, data)
      }
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.companySetting,
      })
    },
    onError: (err: Error) => showError(err, t('api.saveCompanyInfoFailed')),
  })

  const handleSave = async () => {
    if (!canSave) {
      message.warning(t('common.noPermission'))
      return
    }

    try {
      const values = await validateForm<CompanySettingFormValues>(form)
      const settlementAccounts = values.settlementAccounts || []
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
          usageType: account.usageType || SETTLEMENT_TYPE.GENERAL,
          status: account.status || STATUS.NORMAL,
          remark: account.remark?.trim() || '',
        })),
        status: values.status || STATUS.NORMAL,
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
        count: settlementAccountCount,
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

      <Alert
        type="info"
        showIcon
        title={t('system.company.title')}
        description={t('system.company.lockedByOobe')}
      />
      {!canView && (
        <Alert
          type="warning"
          showIcon
          title={t('common.noPermission')}
          description={t('system.company.noViewPermission')}
        />
      )}
      {isLoading ? (
        <Card>
          <Skeleton active />
        </Card>
      ) : (
        <Form form={form} layout="vertical" initialValues={initialValues}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <CompanySubjectCard
                form={form}
                canSave={canSave}
                settlementAccountCount={settlementAccountCount}
              />
            </Col>
            <Col xs={24} lg={16}>
              <CompanySettlementAccountsCard canSave={canSave} />
            </Col>
          </Row>
          <Card
            size="small"
            className="mt-16"
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
