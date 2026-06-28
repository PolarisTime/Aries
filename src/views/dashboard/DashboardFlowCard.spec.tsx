import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'dashboard.sections.businessFlow': '业务流程',
        'common.masterData': '主数据',
        'common.masterDataDesc': '管理基础数据',
        'common.purchaseChain': '采购链',
        'common.purchaseChainDesc': '采购业务流程',
        'common.salesChain': '销售链',
        'common.salesChainDesc': '销售业务流程',
        'common.logisticsChain': '物流链',
        'common.logisticsChainDesc': '物流业务流程',
        'dashboard.flow.material.title': '物料',
        'dashboard.flow.material.hint': '管理物料信息',
        'dashboard.flow.material.metric': '100 个物料',
        'dashboard.flow.supplier.title': '供应商',
        'dashboard.flow.supplier.hint': '管理供应商信息',
        'dashboard.flow.supplier.metric': '50 个供应商',
        'dashboard.flow.customer.title': '客户',
        'dashboard.flow.customer.hint': '管理客户信息',
        'dashboard.flow.customer.metric': '75 个客户',
        'dashboard.flow.warehouse.title': '仓库',
        'dashboard.flow.warehouse.hint': '管理仓库信息',
        'dashboard.flow.purchaseContract.title': '采购合同',
        'dashboard.flow.purchaseContract.hint': '管理采购合同',
        'dashboard.flow.purchaseOrder.title': '采购订单',
        'dashboard.flow.purchaseOrder.hint': '管理采购订单',
        'dashboard.flow.purchaseInbound.title': '采购入库',
        'dashboard.flow.purchaseInbound.hint': '管理采购入库',
        'dashboard.flow.supplierStatement.title': '供应商对账',
        'dashboard.flow.supplierStatement.hint': '管理供应商对账',
        'dashboard.flow.payment.title': '付款',
        'dashboard.flow.payment.hint': '管理付款信息',
        'dashboard.flow.salesContract.title': '销售合同',
        'dashboard.flow.salesContract.hint': '管理销售合同',
        'dashboard.flow.salesOrder.title': '销售订单',
        'dashboard.flow.salesOrder.hint': '管理销售订单',
        'dashboard.flow.salesOutbound.title': '销售出库',
        'dashboard.flow.salesOutbound.hint': '管理销售出库',
        'dashboard.flow.customerStatement.title': '客户对账',
        'dashboard.flow.customerStatement.hint': '管理客户对账',
        'dashboard.flow.receipt.title': '收款',
        'dashboard.flow.receipt.hint': '管理收款信息',
        'dashboard.flow.carrier.title': '承运商',
        'dashboard.flow.carrier.hint': '管理承运商信息',
        'dashboard.flow.freightBill.title': '运费单',
        'dashboard.flow.freightBill.hint': '管理运费单',
        'dashboard.flow.freightStatement.title': '物流对账',
        'dashboard.flow.freightStatement.hint': '管理物流对账',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/views/dashboard/dashboard-flow-utils', () => ({
  buildWorkflowSections: () => [
    {
      key: 'master',
      title: '主数据',
      description: '管理基础数据',
      nodes: [
        {
          key: 'material',
          title: '物料',
          path: '/material',
          icon: () => <div>物料图标</div>,
          hint: '管理物料信息',
          metric: '100 个物料',
        },
      ],
    },
  ],
}))

import { DashboardFlowCard } from '@/views/dashboard/DashboardFlowCard'

describe('DashboardFlowCard', () => {
  const defaultProps = {
    navigate: vi.fn(),
    summary: {},
  }

  it('renders card title', () => {
    render(<DashboardFlowCard {...defaultProps} />)
    expect(screen.getByText('业务流程')).toBeTruthy()
  })

  it('renders workflow sections', () => {
    render(<DashboardFlowCard {...defaultProps} />)
    expect(screen.getByText('主数据')).toBeTruthy()
    expect(screen.getByText('管理基础数据')).toBeTruthy()
  })

  it('renders workflow nodes', () => {
    render(<DashboardFlowCard {...defaultProps} />)
    expect(screen.getByText('物料')).toBeTruthy()
    expect(screen.getByText('管理物料信息')).toBeTruthy()
  })

  it('renders node metrics', () => {
    render(<DashboardFlowCard {...defaultProps} />)
    expect(screen.getByText('100 个物料')).toBeTruthy()
  })

  it('calls navigate when node is clicked', () => {
    const navigate = vi.fn()
    render(<DashboardFlowCard {...defaultProps} navigate={navigate} />)
    fireEvent.click(screen.getByText('物料'))
    expect(navigate).toHaveBeenCalledWith({ to: '/material' })
  })

  it('renders business flow lanes with arrows', () => {
    render(<DashboardFlowCard {...defaultProps} />)
    expect(document.querySelector('.dashboard-flow-lanes')).toBeTruthy()
    expect(document.querySelector('.dashboard-flow-lane')).toBeTruthy()
    expect(document.querySelector('.dashboard-flow-arrow')).toBeNull()
  })
})
