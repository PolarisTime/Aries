import {
  CloudServerOutlined,
  ControlOutlined,
  NumberOutlined,
} from '@ant-design/icons'
import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
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
        icon: <ControlOutlined aria-hidden />,
        children: <GeneralSettingsView />,
      },
      {
        key: 'number-rules',
        label: t('system.systemParameters.numberRulesTab'),
        icon: <NumberOutlined aria-hidden />,
        children: <NumberRulesView />,
      },
      {
        key: 'oss',
        label: t('system.systemParameters.ossTab'),
        icon: <CloudServerOutlined aria-hidden />,
        children: <OssSettingsView />,
      },
    ],
    [t],
  )

  return (
    <AppProPage
      className="system-parameters-page"
      title={t('system.systemParameters.title')}
      description={t('system.systemParameters.description')}
    >
      <Tabs
        className="system-parameters-tabs"
        classNames={{
          body: 'system-parameters-tabs-body',
          content: 'system-parameters-tabs-content',
        }}
        activeKey={activeKey}
        items={items}
        size="large"
        onChange={(key) => setActiveKey(key as SystemParametersTabKey)}
      />
    </AppProPage>
  )
}
