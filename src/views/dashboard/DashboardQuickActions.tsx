import {
  AppstoreAddOutlined,
  ExportOutlined,
  PlusOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import { Button, Card } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'

interface QuickAction {
  key: string
  labelKey: string
  pathname: string
  icon: ReactNode
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'purchase-order',
    labelKey: 'dashboard.quick.newPurchaseOrder',
    pathname: '/purchase-order',
    icon: <PlusOutlined />,
  },
  {
    key: 'sales-order',
    labelKey: 'dashboard.quick.newSalesOrder',
    pathname: '/sales-order',
    icon: <ShoppingOutlined />,
  },
  {
    key: 'sales-outbound',
    labelKey: 'dashboard.quick.newOutbound',
    pathname: '/sales-outbound',
    icon: <ExportOutlined />,
  },
  {
    key: 'material',
    labelKey: 'dashboard.quick.newMasterData',
    pathname: '/material',
    icon: <AppstoreAddOutlined />,
  },
]

/** 常用快捷入口：2×2 图标按钮网格，直达对应模块新建/列表 */
export function DashboardQuickActions() {
  const { t } = useTranslation()
  const openTab = useTabOpen()

  return (
    <Card size="small" title={t('dashboard.quick.title')}>
      <div className="dashboard-quick-grid">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.key}
            onClick={() => openTab({ pathname: action.pathname })}
          >
            <span className="dashboard-quick-item">
              <span className="dashboard-quick-icon" aria-hidden>
                {action.icon}
              </span>
              <span>{t(action.labelKey)}</span>
            </span>
          </Button>
        ))}
      </div>
    </Card>
  )
}
