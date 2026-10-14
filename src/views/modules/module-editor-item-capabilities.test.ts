import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import {
  canReorderModuleEditorItems,
  resolveModuleEditorItemCapabilities,
} from './module-editor-item-capabilities'

function createConfig(
  overrides: Partial<ModulePageConfig> = {},
): ModulePageConfig {
  return {
    key: 'sales-order',
    title: '销售订单',
    kicker: 'Sales',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    ...overrides,
  }
}

const salesOrderConfig = createConfig({
  parentImport: {
    parentModuleKey: 'purchase-order',
    label: '采购订单',
    parentFieldKey: 'purchaseOrderNo',
    parentDisplayFieldKey: 'orderNo',
  },
})

/** 销售订单：已导入上游采购来源，表单里已有父单号。 */
function resolve(options: {
  moduleKey?: string
  config?: ModulePageConfig
  parentImportedItemEditLocked?: boolean
  hasItems?: boolean
  canManageItems?: boolean
  canAddManualItems?: boolean
  canSave?: boolean
  lineItemsLocked?: boolean
}) {
  return resolveModuleEditorItemCapabilities({
    moduleKey: 'sales-order',
    config: salesOrderConfig,
    parentImportedItemEditLocked: false,
    hasItems: true,
    canManageItems: true,
    canAddManualItems: true,
    canSave: true,
    lineItemsLocked: false,
    ...options,
  })
}

describe('resolveModuleEditorItemCapabilities', () => {
  it('未导入上游时：管理/新增/导入全部按权限开放', () => {
    expect(resolve({})).toMatchObject({
      parentImportedItemEditLocked: false,
      parentImportedItemAreaLocked: false,
      parentImportedItemRemovalUnlocked: false,
      canManageCurrentItems: true,
      canAddManualItemsForCurrentRecord: true,
      canImportParentItems: true,
    })
  })

  it('销售订单导入上游后仍保留「选择 + 删除选中」，但禁用新增/再次导入与字段编辑', () => {
    const capabilities = resolve({
      parentImportedItemEditLocked: true,
      hasItems: true,
    })
    expect(capabilities).toMatchObject({
      parentImportedItemAreaLocked: true,
      parentImportedItemRemovalUnlocked: true,
      // 删除入口保留：管理列与「删除选中」依赖该标记
      canManageCurrentItems: true,
      // 字段编辑、手工新增与再次导入仍锁定
      parentImportedItemEditLocked: true,
      canAddManualItemsForCurrentRecord: false,
      canImportParentItems: false,
    })
  })

  it('未声明 allowsItemRemovalWhenParentImported 的模块导入后删除入口仍禁用', () => {
    const capabilities = resolve({
      moduleKey: 'purchase-order',
      parentImportedItemEditLocked: true,
      hasItems: true,
    })
    expect(capabilities).toMatchObject({
      parentImportedItemRemovalUnlocked: false,
      canManageCurrentItems: false,
    })
  })

  it('导入行被全部删除后行区解除锁定：可以重新导入上游单据，但仍不能手工新增行', () => {
    const capabilities = resolve({
      parentImportedItemEditLocked: true,
      hasItems: false,
    })
    expect(capabilities).toMatchObject({
      parentImportedItemAreaLocked: false,
      canImportParentItems: true,
      // 手工行没有采购来源，保存必然被后端拒绝，因此始终不放开
      canAddManualItemsForCurrentRecord: false,
      parentImportedItemEditLocked: true,
    })
  })

  it('只读/明细锁定/无管理权限时删除入口口径一致：一律禁用', () => {
    expect(
      resolve({
        parentImportedItemEditLocked: true,
        hasItems: true,
        lineItemsLocked: true,
        canManageItems: false,
      }).canManageCurrentItems,
    ).toBe(false)
    expect(
      resolve({
        parentImportedItemEditLocked: true,
        hasItems: true,
        canManageItems: false,
      }).canManageCurrentItems,
    ).toBe(false)
    expect(
      resolve({
        parentImportedItemEditLocked: true,
        hasItems: true,
        config: createConfig({
          readOnly: true,
          parentImport: salesOrderConfig.parentImport,
        }),
      }).canImportParentItems,
    ).toBe(false)
    expect(
      resolve({
        canSave: false,
        parentImportedItemEditLocked: true,
        hasItems: false,
      }).canImportParentItems,
    ).toBe(false)
  })

  it('没有配置上游导入的模块不提供导入能力', () => {
    expect(resolve({ config: createConfig() }).canImportParentItems).toBe(false)
  })
})

/**
 * 行序(整行长按拖动)可用性口径。
 *
 * <p>业务背景: 用户诉求是"**销售订单**编辑允许拖动行位置", 而销售订单明细只能来自上游
 * 采购来源导入 —— 若沿用"导入即禁拖", 这条诉求在销售订单上永远不成立。行序因此从
 * "上游导入锁定"里摘出来: 拖动只重排数组、服务端按下标重编 `line_no`, 不改任何导入字段值
 * 与来源分配; 且导入态本就允许「删除选中行」, 行序管理与它同级。</p>
 *
 * <p>红验证: 在该判定里加回 `!parentImportedItemEditLocked` 后, 第一条用例(导入锁定态
 * 仍可排序)立即变红。</p>
 */
describe('明细行序可用性', () => {
  it('销售订单导入锁定态(行来自上游)仍可拖动排序', () => {
    expect(
      canReorderModuleEditorItems({
        moduleKey: 'sales-order',
        canManageItems: true,
        parentImportedItemEditLocked: true,
      }),
    ).toBe(true)
  })

  it('物流单/运费对账单的设计性禁拖不被放宽', () => {
    for (const moduleKey of ['freight-bill', 'freight-statement']) {
      expect(
        canReorderModuleEditorItems({
          moduleKey,
          canManageItems: true,
          parentImportedItemEditLocked: false,
        }),
        `${moduleKey} 应保持禁拖`,
      ).toBe(false)
    }
  })

  it('只读/保存中等不可管理明细时不可排序(不挂拖动, 而不是"能拖但落位被忽略")', () => {
    expect(
      canReorderModuleEditorItems({
        moduleKey: 'sales-order',
        canManageItems: false,
        parentImportedItemEditLocked: false,
      }),
    ).toBe(false)
  })

  it('未注册行为表的模块按默认可排序处理', () => {
    expect(
      canReorderModuleEditorItems({
        moduleKey: 'purchase-order',
        canManageItems: true,
      }),
    ).toBe(true)
  })
})
