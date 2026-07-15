import {
  KeyOutlined,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import { ApiKeyManagementView } from '@/views/system/ApiKeyManagementView'
import { SecurityKeyManagementView } from '@/views/system/SecurityKeyManagementView'
import { SessionManagementView } from '@/views/system/SessionManagementView'

type SecurityCenterTabKey = 'sessions' | 'api-keys' | 'security-keys'

export function SecurityCenterView(): React.JSX.Element {
  const { t } = useTranslation()
  const [activeKey, setActiveKey] = useState<SecurityCenterTabKey>('sessions')

  const items = useMemo(
    () => [
      {
        key: 'sessions',
        label: t('system.securityCenter.sessionsTab'),
        icon: <UserSwitchOutlined aria-hidden />,
        children: (
          <SessionManagementView active={activeKey === 'sessions'} embedded />
        ),
      },
      {
        key: 'api-keys',
        label: t('system.securityCenter.apiKeysTab'),
        icon: <KeyOutlined aria-hidden />,
        children: (
          <ApiKeyManagementView active={activeKey === 'api-keys'} embedded />
        ),
      },
      {
        key: 'security-keys',
        label: t('system.securityCenter.securityKeysTab'),
        icon: <SafetyCertificateOutlined aria-hidden />,
        children: (
          <SecurityKeyManagementView active={activeKey === 'security-keys'} />
        ),
      },
    ],
    [activeKey, t],
  )

  return (
    <AppProPage
      className="security-center-page"
      title={t('system.securityCenter.title')}
      description={t('system.securityCenter.description')}
    >
      <div className="page-stack settings-tabbed-page">
        <Tabs
          className="settings-standard-tabs"
          classNames={{
            body: 'settings-standard-tabs-body',
            content: 'settings-standard-tabs-content',
          }}
          activeKey={activeKey}
          items={items}
          size="large"
          onChange={(key) => setActiveKey(key as SecurityCenterTabKey)}
        />
      </div>
    </AppProPage>
  )
}
