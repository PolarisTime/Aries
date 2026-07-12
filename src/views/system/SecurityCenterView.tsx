import {
  KeyOutlined,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons'
import { Tabs, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
        children: <SessionManagementView active={activeKey === 'sessions'} />,
      },
      {
        key: 'api-keys',
        label: t('system.securityCenter.apiKeysTab'),
        icon: <KeyOutlined aria-hidden />,
        children: <ApiKeyManagementView active={activeKey === 'api-keys'} />,
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
    <div className="page-stack settings-tabbed-page security-center-page">
      <header className="settings-page-header">
        <Typography.Title level={3}>
          {t('system.securityCenter.title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {t('system.securityCenter.description')}
        </Typography.Paragraph>
      </header>
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
  )
}
