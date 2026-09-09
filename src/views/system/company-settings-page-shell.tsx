import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'

interface CompanySettingsPageActionsProps {
  canSave: boolean
  loading: boolean
  saving: boolean
  onRefresh: () => void
  onSave: () => void
}

export function CompanySettingsPageActions({
  canSave,
  loading,
  saving,
  onRefresh,
  onSave,
}: CompanySettingsPageActionsProps) {
  const { t } = useTranslation()
  return (
    <Space size={8} wrap>
      <Button loading={loading} icon={<ReloadOutlined />} onClick={onRefresh}>
        {t('common.refresh')}
      </Button>
      {canSave ? (
        <Button
          type="primary"
          loading={saving}
          icon={<SaveOutlined />}
          onClick={onSave}
        >
          {t('common.save')}
        </Button>
      ) : null}
    </Space>
  )
}

interface CompanySettingsPageShellProps {
  children?: React.ReactNode
  extra?: React.ReactNode
}

export function CompanySettingsPageShell({
  children,
  extra,
}: CompanySettingsPageShellProps) {
  const { t } = useTranslation()
  return (
    <AppProPage
      title={t('system.companyHeader.title')}
      description={t('system.companyHeader.description')}
      extra={extra}
    >
      <div className="settings-standard-page">{children}</div>
    </AppProPage>
  )
}
