import { Tabs } from 'antd'
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
        children: <SessionManagementView active={activeKey === 'sessions'} />,
      },
      {
        key: 'api-keys',
        label: t('system.securityCenter.apiKeysTab'),
        children: <ApiKeyManagementView active={activeKey === 'api-keys'} />,
      },
      {
        key: 'security-keys',
        label: t('system.securityCenter.securityKeysTab'),
        children: (
          <SecurityKeyManagementView active={activeKey === 'security-keys'} />
        ),
      },
    ],
    [activeKey, t],
  )

  return (
    <div className="page-stack page-workspace-stack security-center-page">
      <Tabs
        className="page-workspace-tabs"
        activeKey={activeKey}
        items={items}
        onChange={(key) => setActiveKey(key as SecurityCenterTabKey)}
        destroyOnHidden
      />
    </div>
  )
}
