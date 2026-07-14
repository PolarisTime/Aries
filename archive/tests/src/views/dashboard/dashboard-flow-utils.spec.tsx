import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
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
        'dashboard.flow.material.metric': '{{count}} 个物料',
        'dashboard.flow.supplier.title': '供应商',
        'dashboard.flow.supplier.hint': '管理供应商信息',
        'dashboard.flow.supplier.metric': '{{count}} 个供应商',
        'dashboard.flow.customer.title': '客户',
        'dashboard.flow.customer.hint': '管理客户信息',
        'dashboard.flow.customer.metric': '{{count}} 个客户',
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

import { buildWorkflowSections } from '@/views/dashboard/dashboard-flow-utils'

describe('dashboard-flow-utils', () => {
  const t = (key: string, params?: Record<string, unknown>) => {
    const map: Record<string, string> = {
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
      'dashboard.flow.material.metric': `${params?.count ?? 0} 个物料`,
      'dashboard.flow.supplier.title': '供应商',
      'dashboard.flow.supplier.hint': '管理供应商信息',
      'dashboard.flow.supplier.metric': `${params?.count ?? 0} 个供应商`,
      'dashboard.flow.customer.title': '客户',
      'dashboard.flow.customer.hint': '管理客户信息',
      'dashboard.flow.customer.metric': `${params?.count ?? 0} 个客户`,
      'dashboard.flow.warehouse.title': '仓库',
      'dashboard.flow.warehouse.hint': '管理仓库信息',
    }
    return map[key] ?? key
  }

  describe('buildWorkflowSections', () => {
    it('returns 4 workflow sections', () => {
      const sections = buildWorkflowSections(t)
      expect(sections).toHaveLength(4)
    })

    it('returns master data section with 4 nodes', () => {
      const sections = buildWorkflowSections(t)
      const masterSection = sections.find((s) => s.key === 'master')
      expect(masterSection).toBeDefined()
      expect(masterSection!.nodes).toHaveLength(4)
    })

    it('returns purchase section with 5 nodes', () => {
      const sections = buildWorkflowSections(t)
      const purchaseSection = sections.find((s) => s.key === 'purchase')
      expect(purchaseSection).toBeDefined()
      expect(purchaseSection!.nodes).toHaveLength(5)
    })

    it('returns sales section with 5 nodes', () => {
      const sections = buildWorkflowSections(t)
      const salesSection = sections.find((s) => s.key === 'sales')
      expect(salesSection).toBeDefined()
      expect(salesSection!.nodes).toHaveLength(5)
    })

    it('returns freight section with 3 nodes', () => {
      const sections = buildWorkflowSections(t)
      const freightSection = sections.find((s) => s.key === 'freight')
      expect(freightSection).toBeDefined()
      expect(freightSection!.nodes).toHaveLength(3)
    })

    it('returns correct section titles', () => {
      const sections = buildWorkflowSections(t)
      expect(sections[0].title).toBe('主数据')
      expect(sections[1].title).toBe('采购链')
      expect(sections[2].title).toBe('销售链')
      expect(sections[3].title).toBe('物流链')
    })

    it('returns material node with correct properties', () => {
      const sections = buildWorkflowSections(t)
      const masterSection = sections.find((s) => s.key === 'master')
      const materialNode = masterSection!.nodes.find(
        (n) => n.key === 'material',
      )
      expect(materialNode).toBeDefined()
      expect(materialNode!.title).toBe('物料')
      expect(materialNode!.path).toBe('/material')
      expect(materialNode!.hint).toBe('管理物料信息')
    })

    it('returns nodes with icons', () => {
      const sections = buildWorkflowSections(t)
      sections.forEach((section) => {
        section.nodes.forEach((node) => {
          expect(node.icon).toBeDefined()
        })
      })
    })

    it('returns nodes without presentation colors', () => {
      const sections = buildWorkflowSections(t)
      sections.forEach((section) => {
        expect('accent' in section).toBe(false)
        section.nodes.forEach((node) => {
          expect('tone' in node).toBe(false)
        })
      })
    })

    it('uses summary data for metrics', () => {
      const summary = {
        materialCount: 100,
        supplierCount: 50,
        customerCount: 75,
      }
      const sections = buildWorkflowSections(t, summary as never)
      const masterSection = sections.find((s) => s.key === 'master')
      const materialNode = masterSection!.nodes.find(
        (n) => n.key === 'material',
      )
      expect(materialNode!.metric).toBe('100 个物料')
    })
  })
})
