import {
  AccountBookOutlined,
  BankOutlined,
  CarOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProfileOutlined,
  ShopOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import type { TFunction } from 'i18next'
import type { DashboardSummary } from '@/api/dashboard'
import type { WorkflowSection } from '@/views/dashboard/dashboard-view-types'

export function buildWorkflowSections(
  t: TFunction,
  summary?: DashboardSummary,
): WorkflowSection[] {
  return [
    {
      key: 'master',
      title: t('common.masterData'),
      description: t('common.masterDataDesc'),
      nodes: [
        {
          key: 'material',
          title: t('dashboard.flow.material.title'),
          path: '/material',
          icon: DatabaseOutlined,
          hint: t('dashboard.flow.material.hint'),
          metric: t('dashboard.flow.material.metric', {
            count: summary?.materialCount ?? 0,
          }),
        },
        {
          key: 'supplier',
          title: t('dashboard.flow.supplier.title'),
          path: '/supplier',
          icon: ShopOutlined,
          hint: t('dashboard.flow.supplier.hint'),
          metric: t('dashboard.flow.supplier.metric', {
            count: summary?.supplierCount ?? 0,
          }),
        },
        {
          key: 'customer',
          title: t('dashboard.flow.customer.title'),
          path: '/customer',
          icon: TeamOutlined,
          hint: t('dashboard.flow.customer.hint'),
          metric: t('dashboard.flow.customer.metric', {
            count: summary?.customerCount ?? 0,
          }),
        },
        {
          key: 'warehouse',
          title: t('dashboard.flow.warehouse.title'),
          path: '/warehouse',
          icon: BankOutlined,
          hint: t('dashboard.flow.warehouse.hint'),
        },
      ],
    },
    {
      key: 'purchase',
      title: t('common.purchaseChain'),
      description: t('common.purchaseChainDesc'),
      nodes: [
        {
          key: 'purchase-order',
          title: t('dashboard.flow.purchaseOrder.title'),
          path: '/purchase-order',
          icon: ProfileOutlined,
          hint: t('dashboard.flow.purchaseOrder.hint'),
        },
        {
          key: 'purchase-inbound',
          title: t('dashboard.flow.purchaseInbound.title'),
          path: '/purchase-inbound',
          icon: InboxOutlined,
          hint: t('dashboard.flow.purchaseInbound.hint'),
        },
        {
          key: 'payment',
          title: t('dashboard.flow.payment.title'),
          path: '/payment',
          icon: AccountBookOutlined,
          hint: t('dashboard.flow.payment.hint'),
        },
      ],
    },
    {
      key: 'sales',
      title: t('common.salesChain'),
      description: t('common.salesChainDesc'),
      nodes: [
        {
          key: 'sales-order',
          title: t('dashboard.flow.salesOrder.title'),
          path: '/sales-order',
          icon: FileDoneOutlined,
          hint: t('dashboard.flow.salesOrder.hint'),
        },
        {
          key: 'sales-outbound',
          title: t('dashboard.flow.salesOutbound.title'),
          path: '/sales-outbound',
          icon: SwapOutlined,
          hint: t('dashboard.flow.salesOutbound.hint'),
        },
        {
          key: 'customer-statement',
          title: t('dashboard.flow.customerStatement.title'),
          path: '/customer-statement',
          icon: FileTextOutlined,
          hint: t('dashboard.flow.customerStatement.hint'),
        },
        {
          key: 'receipt',
          title: t('dashboard.flow.receipt.title'),
          path: '/receipt',
          icon: AccountBookOutlined,
          hint: t('dashboard.flow.receipt.hint'),
        },
      ],
    },
    {
      key: 'freight',
      title: t('common.logisticsChain'),
      description: t('common.logisticsChainDesc'),
      nodes: [
        {
          key: 'carrier',
          title: t('dashboard.flow.carrier.title'),
          path: '/carrier',
          icon: CarOutlined,
          hint: t('dashboard.flow.carrier.hint'),
        },
        {
          key: 'freight-bill',
          title: t('dashboard.flow.freightBill.title'),
          path: '/freight-bill',
          icon: CarOutlined,
          hint: t('dashboard.flow.freightBill.hint'),
        },
        {
          key: 'freight-statement',
          title: t('dashboard.flow.freightStatement.title'),
          path: '/freight-statement',
          icon: FileSearchOutlined,
          hint: t('dashboard.flow.freightStatement.hint'),
        },
      ],
    },
  ]
}
