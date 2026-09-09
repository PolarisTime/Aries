import { ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Skeleton } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CompanySettingProfile } from '@/api/system/company-settings'
import { listCompanySettings } from '@/api/system/company-settings'
import { AppResult } from '@/components/AppResult'
import { QUERY_KEYS } from '@/constants/query-keys'
import { CompanySettingsForm } from './CompanySettingsForm'
import { CompanySettingsPageShell } from './company-settings-page-shell'

const EMPTY_COMPANY_SETTINGS: CompanySettingProfile[] = []

export function CompanySettingsView() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState('')

  const companyQuery = useQuery({
    queryKey: QUERY_KEYS.companySettings,
    queryFn: listCompanySettings,
  })
  const companies = companyQuery.data ?? EMPTY_COMPANY_SETTINGS

  const effectiveSelectedId = useMemo(() => {
    if (selectedId === 'new') {
      return selectedId
    }
    if (companies.some((item) => item.id === selectedId)) {
      return selectedId
    }
    return companies[0]?.id ?? ''
  }, [companies, selectedId])

  if (companyQuery.isPending) {
    return (
      <CompanySettingsPageShell>
        <Skeleton active paragraph={{ rows: 10 }} />
      </CompanySettingsPageShell>
    )
  }

  if (companyQuery.isError) {
    return (
      <CompanySettingsPageShell>
        <AppResult
          status="error"
          title={t('system.company.loadFailed')}
          subTitle={t('result.error.subTitle')}
          extra={
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={companyQuery.isFetching}
              onClick={() => {
                void companyQuery.refetch()
              }}
            >
              {t('error.retry')}
            </Button>
          }
        />
      </CompanySettingsPageShell>
    )
  }

  return (
    <CompanySettingsForm
      companies={companies}
      isFetching={companyQuery.isFetching}
      selectedId={effectiveSelectedId}
      onRefresh={() => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.companySettings,
        })
      }}
      onSelect={setSelectedId}
      onSelectSaved={setSelectedId}
      onCreateDraft={() => setSelectedId('new')}
    />
  )
}
