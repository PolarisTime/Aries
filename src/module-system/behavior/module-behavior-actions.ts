import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'

export const contributeActionBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
  registerModuleBehavior('customer', {
    actionKindsByKey: {
      manage_customer_projects: 'openCustomerProjects',
    },
  })

  registerModuleBehavior('customer-statement', {
    actionKindsByKey: {
      generate_statement: 'openCreateEditor',
      view_customer_summary: 'openCustomerSummary',
    },
    actionKindsByLabel: {
      生成对账单: 'openCreateEditor',
      查看客户对账汇总: 'openCustomerSummary',
    },
  })

  registerModuleBehavior('freight-statement', {
    actionKindsByKey: {
      generate_freight_statement: 'openCreateEditor',
      view_freight_summary: 'openFreightSummary',
    },
    actionKindsByLabel: {
      生成物流对账单: 'openCreateEditor',
      查看运费对账汇总: 'openFreightSummary',
    },
  })

  registerModuleBehavior('freight-bill', {
    actionKindsByKey: {
      create_freight_bill: 'openCreateEditor',
    },
  })
}
