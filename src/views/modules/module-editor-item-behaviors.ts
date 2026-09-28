/**
 * 编辑器明细区 per-module 行为表：附加费用 Tab、自动排序、按来源单分组删除、
 * 行拖拽与仓库推荐等按模块分叉的逻辑全部收敛到这里，
 * 消费方只查表，不再书写 `moduleKey === 'xxx'` 字面量比较。
 */

import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import { sortItemsByMaterialDefault } from '@/module-system/editor/module-editor-item-sort'
import type { ModuleLineItem } from '@/types/module-page'
import { sortCustomerStatementItemsByDeliveryDate } from '@/views/modules/customer-statement-item-groups'
import {
  type FreightStatementSortDirection,
  type FreightStatementSortMode,
  sortFreightStatementItems,
} from '@/views/modules/freight-statement-item-groups'

export interface ModuleItemSortBehavior {
  sort: (
    items: ModuleLineItem[],
    mode: FreightStatementSortMode,
    direction: FreightStatementSortDirection,
  ) => ModuleLineItem[]
  /** 点击该排序模式时切换升/降序方向（物流对账单的记账时间列）。 */
  directionToggleMode?: FreightStatementSortMode
}

export interface ModuleEditorItemBehavior {
  /** 附加费用 Tab 是否可用（还需 config.itemColumns 非空）。 */
  supportsExpenseTab?: boolean
  /** 自动排序行为；存在即代表模块支持明细自动排序。 */
  itemSort?: ModuleItemSortBehavior
  /** 选中删除按来源单分组联动移除；返回行所属来源分组 key，空串表示无分组。 */
  itemRemovalSourceGroupKey?: (item: ModuleLineItem) => string
  /**
   * 上游导入锁定明细后仍保留「选择 + 删除选中」入口。
   *
   * 锁定只约束编辑（快照列只读、不能手工新增、不能再次导入），不能剥夺删除能力：
   * 明细必须来源于采购来源的模块（销售订单），只有删掉错行才能释放该来源的已分配数量。
   * 删除本身不报错也不再要求该行重新关联采购来源。
   */
  allowsItemRemovalWhenParentImported?: boolean
  /** 禁用明细行拖拽排序。 */
  disablesItemReorder?: boolean
  /** 启用仓库推荐（采购订单）。 */
  enablesWarehouseRecommendations?: boolean
}

const MODULE_EDITOR_ITEM_BEHAVIORS = {
  'purchase-order': {
    supportsExpenseTab: true,
    enablesWarehouseRecommendations: true,
  },
  'sales-order': {
    supportsExpenseTab: true,
    // 导入上游采购来源后行区锁定，但仍允许选中删除：删除即把该行占用的来源数量释放回来源单，
    // 否则用户无法移除导入错的行，只能改数量/改来源，保存时被来源校验拦下。
    allowsItemRemovalWhenParentImported: true,
    itemSort: {
      sort: (items: ModuleLineItem[]) => sortItemsByMaterialDefault(items),
    },
  },
  // 物流单支持行级拆分/部分导入：删除按单行处理，不再按来源单整组联动移除。
  'freight-bill': {
    supportsExpenseTab: true,
    disablesItemReorder: true,
  },
  'customer-statement': {
    itemSort: {
      sort: (items: ModuleLineItem[]) =>
        sortCustomerStatementItemsByDeliveryDate(items),
    },
  },
  'freight-statement': {
    disablesItemReorder: true,
    itemSort: {
      sort: (
        items: ModuleLineItem[],
        mode: FreightStatementSortMode,
        direction: FreightStatementSortDirection,
      ) =>
        sortFreightStatementItems(
          items,
          mode,
          mode === 'billTime' ? direction : 'asc',
        ),
      directionToggleMode: 'billTime',
    },
    itemRemovalSourceGroupKey: (item: ModuleLineItem) =>
      item.sourceFreightBillId == null ? '' : String(item.sourceFreightBillId),
  },
} satisfies Partial<Record<ModuleKey, ModuleEditorItemBehavior>>

/** 未知模块 key（不在 MODULE_KEYS 内）回退为 undefined，消费方按默认行为处理。 */
export function getModuleEditorItemBehavior(
  moduleKey: string,
): ModuleEditorItemBehavior | undefined {
  if (!isModuleKey(moduleKey)) return undefined
  return (
    MODULE_EDITOR_ITEM_BEHAVIORS as Partial<
      Record<ModuleKey, ModuleEditorItemBehavior>
    >
  )[moduleKey]
}
