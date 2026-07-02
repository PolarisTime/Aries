import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GeneralSettingsView } from '@/views/system/GeneralSettingsView'
import { NumberRulesView } from '@/views/system/NumberRulesView'
import { OssSettingsView } from '@/views/system/OssSettingsView'

type SystemParametersTabKey = 'general' | 'number-rules' | 'oss'

export function SystemParametersView(): React.JSX.Element {
  const { t } = useTranslation()
  const [activeKey, setActiveKey] = useState<SystemParametersTabKey>('general')

  const items = useMemo(
    () => [
      {
        key: 'general',
        label: t('system.systemParameters.generalTab'),
        children: <GeneralSettingsView />,
      },
      {
        key: 'number-rules',
        label: t('system.systemParameters.numberRulesTab'),
        children: <NumberRulesView />,
      },
      {
        key: 'oss',
        label: t('system.systemParameters.ossTab'),
        children: <OssSettingsView />,
      },
    ],
    [t],
  )

  return (
    <div className="page-stack page-workspace-stack system-parameters-page">
      <Tabs
        className="page-workspace-tabs"
        activeKey={activeKey}
        items={items}
        onChange={(key) => setActiveKey(key as SystemParametersTabKey)}
        destroyOnHidden
      />
    </div>
  )
}
