import type { ModuleLineItem } from '@/types/module-page'
import type { ModuleItemGroup } from '@/views/modules/components/ModuleItemGroupsView'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
import {
  groupFreightBillItems,
  groupFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'

export type { ModuleItemGroup }

/** 按模块语义分组明细行；无分组结果时回退到单个空分组，保证表格始终可渲染。 */
export function buildModuleItemGroups(
  moduleKey: string,
  items: ModuleLineItem[],
): ModuleItemGroup[] {
  const itemGroups: ModuleItemGroup[] =
    moduleKey === 'freight-statement'
      ? groupFreightStatementItems(items)
      : moduleKey === 'freight-bill'
        ? groupFreightBillItems(items)
        : moduleKey === 'customer-statement'
          ? groupCustomerStatementItems(items)
          : [
              {
                key: 'all',
                sourceNo: '',
                billTime: '',
                customerName: '',
                projectName: '',
                totalQuantity: 0,
                totalWeightTon: 0,
                items,
              },
            ]
  if (itemGroups.length) return itemGroups
  return moduleKey === 'customer-statement'
    ? [
        {
          key: 'empty',
          groupNo: 1,
          sourceNo: '',
          deliveryDate: '',
          totalQuantity: 0,
          totalWeightTon: 0,
          totalAmount: 0,
          items: [],
        },
      ]
    : [
        {
          key: 'empty',
          sourceNo: '',
          billTime: '',
          customerName: '',
          projectName: '',
          totalQuantity: 0,
          totalWeightTon: 0,
          items: [],
        },
      ]
}
