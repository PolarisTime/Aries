import {
  AccountBookOutlined,
  BankOutlined,
  CarOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProfileOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Card, Modal } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { DashboardFlowCard } from '@/views/dashboard/DashboardFlowCard'

interface ModuleTile {
  key: string
  titleKey: string
  path: string
  icon: typeof FileTextOutlined
  /** 支持经 create=1 深链直接打开新建弹窗 */
  create?: boolean
}

interface ModuleTileGroup {
  key: string
  titleKey: string
  tiles: ModuleTile[]
}

const MODULE_GROUPS: ModuleTileGroup[] = [
  {
    key: 'purchase',
    titleKey: 'common.purchaseChain',
    tiles: [
      {
        key: 'purchase-order',
        titleKey: 'dashboard.flow.purchaseOrder.title',
        path: '/purchase-order',
        icon: ProfileOutlined,
        create: true,
      },
      {
        key: 'purchase-inbound',
        titleKey: 'dashboard.flow.purchaseInbound.title',
        path: '/purchase-inbound',
        icon: InboxOutlined,
        create: true,
      },
      {
        key: 'supplier',
        titleKey: 'dashboard.flow.supplier.title',
        path: '/supplier',
        icon: ShopOutlined,
      },
      {
        key: 'payment',
        titleKey: 'dashboard.flow.payment.title',
        path: '/payment',
        icon: AccountBookOutlined,
        create: true,
      },
    ],
  },
  {
    key: 'sales',
    titleKey: 'common.salesChain',
    tiles: [
      {
        key: 'sales-order',
        titleKey: 'dashboard.flow.salesOrder.title',
        path: '/sales-order',
        icon: FileTextOutlined,
        create: true,
      },
      {
        key: 'sales-outbound',
        titleKey: 'dashboard.flow.salesOutbound.title',
        path: '/sales-outbound',
        icon: FileDoneOutlined,
        create: true,
      },
      {
        key: 'customer',
        titleKey: 'dashboard.flow.customer.title',
        path: '/customer',
        icon: TeamOutlined,
      },
      {
        key: 'receipt',
        titleKey: 'dashboard.flow.receipt.title',
        path: '/receipt',
        icon: AccountBookOutlined,
        create: true,
      },
    ],
  },
  {
    key: 'logistics',
    titleKey: 'common.logisticsChain',
    tiles: [
      {
        key: 'carrier',
        titleKey: 'dashboard.flow.carrier.title',
        path: '/carrier',
        icon: CarOutlined,
      },
      {
        key: 'freight-bill',
        titleKey: 'dashboard.flow.freightBill.title',
        path: '/freight-bill',
        icon: FileTextOutlined,
        create: true,
      },
      {
        key: 'freight-statement',
        titleKey: 'dashboard.flow.freightStatement.title',
        path: '/freight-statement',
        icon: FileDoneOutlined,
        create: true,
      },
    ],
  },
  {
    key: 'master',
    titleKey: 'common.masterData',
    tiles: [
      {
        key: 'material',
        titleKey: 'dashboard.flow.material.title',
        path: '/material',
        icon: DatabaseOutlined,
        create: true,
      },
      {
        key: 'project',
        titleKey: 'dashboard.flow.project.title',
        path: '/project',
        icon: FileTextOutlined,
        create: true,
      },
      {
        key: 'warehouse',
        titleKey: 'dashboard.flow.warehouse.title',
        path: '/warehouse',
        icon: BankOutlined,
      },
    ],
  },
]

/** 全部模块宫格：点击进入模块列表，悬浮 ＋ 直达新建（替代原业务流程图，统一模块入口） */
export function DashboardModuleGrid() {
  const { t } = useTranslation()
  const openTab = useTabOpen()
  const [flowOpen, setFlowOpen] = useState(false)

  return (
    <Card
      size="small"
      className="dashboard-module-card"
      title={t('dashboard.modules.title')}
      extra={
        <Button type="text" size="small" onClick={() => setFlowOpen(true)}>
          {t('dashboard.modules.byFlow')}
        </Button>
      }
    >
      {MODULE_GROUPS.map((group) => (
        <section key={group.key} className="dashboard-module-group">
          <div className="dashboard-module-group-title">
            {t(group.titleKey)}
          </div>
          <div className="dashboard-module-grid">
            {group.tiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div key={tile.key} className="dashboard-module-tile-wrap">
                  <button
                    type="button"
                    className="dashboard-module-tile"
                    onClick={() => openTab({ pathname: tile.path })}
                  >
                    <span className="dashboard-module-tile-icon" aria-hidden>
                      <Icon />
                    </span>
                    <span className="dashboard-module-tile-title">
                      {t(tile.titleKey)}
                    </span>
                  </button>
                  {tile.create ? (
                    <button
                      type="button"
                      className="dashboard-module-tile-create"
                      title={t('dashboard.modules.create')}
                      aria-label={`${t('dashboard.modules.create')} ${t(tile.titleKey)}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        openTab({
                          pathname: tile.path,
                          search: 'create=1',
                          forceSearch: true,
                        })
                      }}
                    >
                      ＋
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <Modal
        title={t('dashboard.sections.businessFlow')}
        open={flowOpen}
        footer={null}
        width={880}
        onCancel={() => setFlowOpen(false)}
      >
        <DashboardFlowCard />
      </Modal>
    </Card>
  )
}
