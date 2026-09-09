import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { ModuleLineItem } from '@/types/module-page'
import type { ModuleItemGroup } from '@/views/modules/components/ModuleItemGroupsView'
import { groupCustomerStatementItems } from '@/views/modules/customer-statement-item-groups'
import {
  groupFreightBillItems,
  groupFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'

export type { ModuleItemGroup }

function buildDefaultAllGroup(items: ModuleLineItem[]): ModuleItemGroup {
  return {
    key: 'all',
    sourceNo: '',
    billTime: '',
    customerName: '',
    projectName: '',
    totalQuantity: 0,
    totalWeightTon: 0,
    items,
  }
}

function buildDefaultEmptyGroup(): ModuleItemGroup {
  return {
    key: 'empty',
    sourceNo: '',
    billTime: '',
    customerName: '',
    projectName: '',
    totalQuantity: 0,
    totalWeightTon: 0,
    items: [],
  }
}

function buildCustomerStatementEmptyGroup(): ModuleItemGroup {
  return {
    key: 'empty',
    groupNo: 1,
    sourceNo: '',
    deliveryDate: '',
    totalQuantity: 0,
    totalWeightTon: 0,
    totalAmount: 0,
    items: [],
  }
}

export interface ModuleItemGroupStrategy {
  buildGroups: (items: ModuleLineItem[]) => ModuleItemGroup[]
  buildEmptyGroups: () => ModuleItemGroup[]
  /** 固定分组视图形态：物流单按项目分组渲染，客户对账单使用专属表头。 */
  groupViewKind?: 'freight-project' | 'customer-statement'
}
/** 分组明细视图形态：除固定形态外，含 projectGroups 的分组按物流对账单渲染。 */
export type ModuleItemGroupViewKind =
  | 'freight-project'
  | 'freight-statement'
  | 'customer-statement'
  | 'plain'

const MODULE_ITEM_GROUP_STRATEGIES = {
  'freight-statement': {
    buildGroups: groupFreightStatementItems,
    buildEmptyGroups: () => [buildDefaultEmptyGroup()],
  },
  'freight-bill': {
    buildGroups: groupFreightBillItems,
    buildEmptyGroups: () => [buildDefaultEmptyGroup()],
    groupViewKind: 'freight-project',
  },
  'customer-statement': {
    buildGroups: groupCustomerStatementItems,
    buildEmptyGroups: () => [buildCustomerStatementEmptyGroup()],
    groupViewKind: 'customer-statement',
  },
} satisfies Partial<Record<ModuleKey, ModuleItemGroupStrategy>>

/** 未知模块 key（不在 MODULE_KEYS 内）回退为 undefined，走单一全量分组。 */
export function getModuleItemGroupStrategy(
  moduleKey: string,
): ModuleItemGroupStrategy | undefined {
  if (!isModuleKey(moduleKey)) return undefined
  return (
    MODULE_ITEM_GROUP_STRATEGIES as Partial<
      Record<ModuleKey, ModuleItemGroupStrategy>
    >
  )[moduleKey]
}

/** 按模块语义分组明细行；无分组结果时回退到单个空分组，保证表格始终可渲染。 */
export function buildModuleItemGroups(
  moduleKey: string,
  items: ModuleLineItem[],
): ModuleItemGroup[] {
  const strategy = getModuleItemGroupStrategy(moduleKey)
  const itemGroups: ModuleItemGroup[] = strategy
    ? strategy.buildGroups(items)
    : [buildDefaultAllGroup(items)]
  if (itemGroups.length) return itemGroups
  return strategy ? strategy.buildEmptyGroups() : [buildDefaultEmptyGroup()]
}

/** 解析单个分组行的渲染形态；判断顺序与历史渲染分支一致。 */
export function resolveModuleItemGroupViewKind(
  moduleKey: string,
  group: ModuleItemGroup,
): ModuleItemGroupViewKind {
  const strategy = getModuleItemGroupStrategy(moduleKey)
  if (strategy?.groupViewKind === 'freight-project') return 'freight-project'
  if ('projectGroups' in group) return 'freight-statement'
  if (strategy?.groupViewKind === 'customer-statement') {
    return 'customer-statement'
  }
  return 'plain'
}
