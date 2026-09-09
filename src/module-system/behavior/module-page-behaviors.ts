/**
 * 页面级 per-module 行为表：列表页/提交流程中按模块 key 分叉的特殊逻辑
 * 全部收敛到这里，消费方只查表，不再书写 `moduleKey === 'xxx'` 字面量比较。
 * 键为 ModuleKey，值通过 `satisfies Partial<Record<ModuleKey, ...>>` 保证类型安全。
 */
import { completeSalesOrder } from '@/api/sales/document-flow-commands'
import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { RuntimeFeatureConfig } from '@/types/runtime-config'

/**
 * 专用状态变更命令：命中 `status` 时先确认，再走 `execute` 命令接口，
 * 而不是通用的 updateBusinessModuleStatus。
 */
export interface ModuleStatusCommand {
  status: string
  confirmTitle: string
  confirmContent: string
  okText: string
  successMessage: string
  execute: (recordId: string) => Promise<unknown>
}

/** 交付核定特例：从 sourceStatus 的“保存并审核”切换为 targetStatus 命令流程。 */
export interface ModuleDeliveryVerification {
  sourceStatus: string
  targetStatus: string
}

export interface ModulePageBehavior {
  statusCommands?: Readonly<Record<string, ModuleStatusCommand>>
  deliveryVerification?: ModuleDeliveryVerification
  /** 保存前统计 0 单价明细并弹“待定价”确认（销售订单）。 */
  confirmsZeroPriceItems?: boolean
  /** 禁止手工新建（对账单类模块仅由系统生成）。 */
  disablesManualCreate?: boolean
  /** 仅称重视图的运行时特性开关。 */
  weightOnlyFeatureKey?: keyof RuntimeFeatureConfig
  /** 状态变更后需要连带刷新列表查询的关联模块。 */
  relatedRefreshModuleKeys?: readonly ModuleKey[]
  /** master options 刷新策略：project 需要同时失效衍生简称缓存。 */
  masterOptionRefreshMode?: 'project' | 'reload'
  /** 批量审核/反审核仅允许单选（采购入库）。 */
  limitsBulkAuditToSingleSelection?: boolean
  /** 新建草稿时自动填充默认结算主体（采购订单）。 */
  autoFillSettlementCompanyOnCreate?: boolean
}

const MODULE_PAGE_BEHAVIORS = {
  'sales-order': {
    deliveryVerification: {
      sourceStatus: '交付核定',
      targetStatus: '完成销售',
    },
    confirmsZeroPriceItems: true,
    statusCommands: {
      完成销售: {
        status: '完成销售',
        confirmTitle: '确认完成销售',
        confirmContent:
          '完成销售后将按最终交付结果进入结算，请确认销售出库和实际重量已经核定。',
        okText: '完成销售',
        successMessage: '完成销售成功',
        execute: (recordId: string) => completeSalesOrder(recordId),
      },
    },
  },
  'purchase-inbound': {
    weightOnlyFeatureKey: 'weightOnlyPurchaseInbound',
    relatedRefreshModuleKeys: ['purchase-order'],
    limitsBulkAuditToSingleSelection: true,
  },
  'purchase-order': {
    autoFillSettlementCompanyOnCreate: true,
  },
  'sales-outbound': {
    weightOnlyFeatureKey: 'weightOnlySalesOutbound',
  },
  project: {
    masterOptionRefreshMode: 'project',
  },
  'customer-statement': {
    disablesManualCreate: true,
  },
  'freight-statement': {
    disablesManualCreate: true,
  },
} satisfies Partial<Record<ModuleKey, ModulePageBehavior>>

/** 未知模块 key（不在 MODULE_KEYS 内）回退为 undefined，消费方按默认行为处理。 */
export function getModulePageBehavior(
  moduleKey: string,
): ModulePageBehavior | undefined {
  if (!isModuleKey(moduleKey)) return undefined
  return (
    MODULE_PAGE_BEHAVIORS as Partial<Record<ModuleKey, ModulePageBehavior>>
  )[moduleKey]
}

export function getModuleStatusCommand(
  moduleKey: string,
  status: string,
): ModuleStatusCommand | undefined {
  return getModulePageBehavior(moduleKey)?.statusCommands?.[status]
}

export function getModuleDeliveryVerification(
  moduleKey: string,
): ModuleDeliveryVerification | undefined {
  return getModulePageBehavior(moduleKey)?.deliveryVerification
}

/** 当前状态是否命中该模块的交付核定特例；未配置特例的模块恒为 false。 */
export function isDeliveryVerificationStatus(
  moduleKey: string,
  status: string,
): boolean {
  const deliveryVerification = getModuleDeliveryVerification(moduleKey)
  if (!deliveryVerification) return false
  return status === deliveryVerification.sourceStatus
}

/** 批量审核/反审核是否仅允许单选；未配置的模块允许多选。 */
export function limitsBulkAuditToSingleSelection(moduleKey: string): boolean {
  return (
    getModulePageBehavior(moduleKey)?.limitsBulkAuditToSingleSelection === true
  )
}

/** 新建草稿时是否自动填充默认结算主体。 */
export function shouldAutoFillSettlementCompanyOnCreate(
  moduleKey: string,
): boolean {
  return (
    getModulePageBehavior(moduleKey)?.autoFillSettlementCompanyOnCreate === true
  )
}
