import {
  AppstoreAddOutlined,
  ExportOutlined,
  PlusOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

export interface QuickAction {
  key: string
  labelKey: string
  pathname: string
  icon: ReactNode
}

export const QUICK_ACTIONS: QuickAction[] = [
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

export function buildQuickActionTarget(action: QuickAction) {
  return {
    pathname: action.pathname,
    search: 'create=1',
    forceSearch: true,
  } as const
}
