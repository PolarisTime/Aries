import { describe, expect, it } from 'vitest'
import type { ModulePageConfig } from '@/types/module-page'
import { resolveModuleEditorItemCapabilities } from './module-editor-item-capabilities'

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
