import i18next from 'i18next'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock(
  import('@/module-system/core/module-option-resolvers'),
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/module-system/core/module-option-resolvers')
      >()
    return {
      ...actual,
      isPurchaseWeighRequiredCategory: vi.fn(
        (category: unknown) => category === '螺纹钢',
      ),
    }
  },
)

import '@/i18n'
import { buildParentImportState } from '@/module-system/adapter/module-adapter-parent-import'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { cloneLineItems } from '@/utils/clone-utils'
import { purchaseInboundsPageConfig } from './purchase-inbound-page'
import {
  buildPurchaseInboundOverview,
  buildPurchaseInboundParentFilters,
  mapPurchaseOrderToInboundDraft,
  transformPurchaseOrderItemsToInboundItems,
  validatePurchaseInboundParentImport,
} from './purchase-inbound-rules'

beforeAll(async () => {
  await i18next.changeLanguage('zh-CN')
})

function recordWith(overrides: Record<string, unknown>): ModuleRecord {
  return { id: '1932500000000000001', ...overrides }
}

interface ParentImportScenario {
  parentRecord: ModuleRecord
  currentRecord?: ModuleRecordInput
  currentParentNos?: string[]
  currentItems?: ModuleLineItem[]
}

function runParentImport({
  parentRecord,
  currentRecord = {},
  currentParentNos = [],
  currentItems = [],
}: ParentImportScenario) {
  const definition = purchaseInboundsPageConfig.parentImport
  if (!definition) {
    throw new Error('采购入库未配置 parentImport')
  }
  return {
    definition,
    validationError: definition.validateParentImport?.({
      currentRecord,
      currentItems,
      currentParentNos,
      parentRecord,
    }),
    state: buildParentImportState({
      parentImportConfig: definition,
      parentRecord,
      currentParentNos,
      currentItems,
      cloneLineItems,
    }),
  }
}

describe('purchase-inbound-rules', () => {
  describe('buildPurchaseInboundOverview', () => {
    it('空行集合返回零值概览', () => {
      const overview = buildPurchaseInboundOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => String(item.value).startsWith('0'))).toBe(
        true,
      )
    })
  })

  describe('buildPurchaseInboundParentFilters', () => {
    it('透传供应商与当前记录 ID', () => {
      const filters = buildPurchaseInboundParentFilters({
        supplierId: '1932500000000000002',
        id: '1932500000000000001',
      })
      expect(filters).toEqual({
        supplierId: '1932500000000000002',
        currentRecordId: '1932500000000000001',
      })
    })
  })

  describe('mapPurchaseOrderToInboundDraft', () => {
    it('映射供应商与结算主体，缺省字段回退为空串', () => {
      const draft = mapPurchaseOrderToInboundDraft(
        recordWith({
          orderNo: 'PO-1',
          supplierId: '1932500000000000002',
          supplierCode: 'S001',
          supplierName: '供应商甲',
        }),
      )
      expect(draft).toEqual({
        purchaseOrderNo: 'PO-1',
        supplierId: '1932500000000000002',
        supplierCode: 'S001',
        supplierName: '供应商甲',
        settlementCompanyId: undefined,
        settlementCompanyName: '',
      })
    })
  })

  describe('transformPurchaseOrderItemsToInboundItems', () => {
    it('父单无明细返回空数组', () => {
      expect(transformPurchaseOrderItemsToInboundItems(recordWith({}))).toEqual(
        [],
      )
    })

    it('过磅品类标记为过磅并计算重量金额', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          orderNo: 'PO-1',
          items: [
            {
              id: '1932500000000000003',
              category: '螺纹钢',
              quantity: 10,
              pieceWeightTon: 0.5,
              unitPrice: 3000,
            },
          ],
        }),
      )
      expect(items[0]).toMatchObject({
        sourceNo: 'PO-1',
        sourcePurchaseOrderItemId: '1932500000000000003',
        settlementMode: '过磅',
        quantity: 10,
        weightTon: 5,
        weighWeightTon: undefined,
        weightAdjustmentTon: 0,
        weightAdjustmentAmount: 0,
        amount: 15000,
      })
    })

    it('理算品类标记为理算', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              category: '其它',
              quantity: 2,
              pieceWeightTon: 1,
              unitPrice: 100,
            },
          ],
        }),
      )
      expect(items[0].settlementMode).toBe('理算')
    })

    it('剩余数量缺失时回退原始数量', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              quantity: 4,
              pieceWeightTon: 0.25,
              unitPrice: 0,
            },
          ],
        }),
      )
      expect(items[0].quantity).toBe(4)
    })

    it('数量字段非法时保持 NaN 透传（与既有行为一致）', () => {
      const items = transformPurchaseOrderItemsToInboundItems(
        recordWith({
          items: [
            {
              id: '1932500000000000003',
              quantity: Number.NaN,
              pieceWeightTon: Number.NaN,
              unitPrice: Number.NaN,
            },
          ],
        }),
      )
      expect(Number.isNaN(items[0].quantity as number)).toBe(true)
      expect(Number.isNaN(items[0].weightTon as number)).toBe(true)
      expect(Number.isNaN(items[0].amount as number)).toBe(true)
    })
  })

  describe('validatePurchaseInboundParentImport（单选：单一来源订单 + 单号长度）', () => {
    it('单张订单号正常时放行', () => {
      expect(
        validatePurchaseInboundParentImport({
          parentRecord: recordWith({ orderNo: 'PO-1' }),
        }),
      ).toBeNull()
    })

    it('单张订单号恰好等于列宽上限时放行（边界值）', () => {
      expect(
        validatePurchaseInboundParentImport({
          parentRecord: recordWith({ orderNo: 'X'.repeat(256) }),
        }),
      ).toBeNull()
    })

    it('单张订单号超出列宽上限时拦截', () => {
      expect(
        validatePurchaseInboundParentImport({
          parentRecord: recordWith({ orderNo: 'X'.repeat(257) }),
        }),
      ).toBe('采购订单号长度不能超过 256 个字符')
    })

    it('空订单号不拦截（是否必填由表单校验负责）', () => {
      expect(
        validatePurchaseInboundParentImport({
          parentRecord: recordWith({ orderNo: '' }),
        }),
      ).toBeNull()
    })

    it('已导入 PO-1 后再选另一张 PO-2：导入前就拦下（不再等保存失败）', () => {
      /*
       * 单选语义：一张入库单只能关联一张采购订单。若放行，共享适配器会把表头来源单号
       * 拼成「PO-1, PO-2」并把两单明细混在一起，用户要填完整单才在保存时被
       * module-editor-validation 的 purchaseInboundMixedSource 拒绝。
       */
      expect(
        validatePurchaseInboundParentImport({
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({ orderNo: 'PO-2' }),
        }),
      ).toBe('一张采购入库单只能关联一张采购订单')
    })

    it('已导入 PO-1 后再次导入同一张 PO-1：放行（用于刷新剩余可入库量）', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({ orderNo: 'PO-1' }),
        }),
      ).toBeNull()
    })
  })

  describe('采购入库单选导入', () => {
    const sourceItems: ModuleLineItem[] = [
      {
        id: '1932500000000000101',
        sourcePurchaseOrderItemId: '1932500000000000101',
        quantity: 1,
        pieceWeightTon: 1,
        unitPrice: 100,
      },
    ]

    it('页面配置不再启用多选，且仍接入导入前校验', () => {
      expect(
        purchaseInboundsPageConfig.parentImport?.allowMultipleSelection,
      ).not.toBe(true)
      expect(
        purchaseInboundsPageConfig.parentImport?.validateParentImport,
      ).toBe(validatePurchaseInboundParentImport)
    })

    it('单张订单导入回填表头供应商与结算主体', () => {
      const single = runParentImport({
        parentRecord: recordWith({
          orderNo: 'PO-1',
          supplierId: '1932500000000000011',
          supplierCode: 'S001',
          supplierName: '供应商甲',
          settlementCompanyId: '1932500000000000021',
          settlementCompanyName: '结算主体甲',
        }),
      })

      expect(single.validationError).toBeNull()
      expect(single.state.shouldApplyMappedValues).toBe(true)
      expect(single.state.mappedValues).toMatchObject({
        supplierId: '1932500000000000011',
        supplierName: '供应商甲',
        settlementCompanyName: '结算主体甲',
      })
    })

    it('单张订单导入保留行级仓库，表头不携带仓库字段', () => {
      const single = runParentImport({
        parentRecord: recordWith({
          orderNo: 'PO-1',
          warehouseId: '1932500000000000201',
          warehouseName: '一号仓',
          items: [
            {
              id: '1932500000000000101',
              warehouseId: '1932500000000000201',
              warehouseName: '一号仓',
              quantity: 1,
              pieceWeightTon: 1,
              unitPrice: 100,
            },
          ],
        }),
      })

      // 表头不携带仓库字段：仓库由行级 warehouseId 决定（多仓库时后端另行处理）。
      const headerWarehouseKeys = (
        purchaseInboundsPageConfig.formFields ?? []
      ).flatMap((field) =>
        field.key === 'warehouseId' || field.key === 'warehouseName'
          ? [field.key]
          : [],
      )
      expect(headerWarehouseKeys).toEqual([])
      expect(single.state.mappedValues.warehouseId).toBeUndefined()
      expect(single.state.nextItems.map((item) => item.warehouseName)).toEqual([
        '一号仓',
      ])
    })

    it('重新导入同一张订单不重复累计来源单号', () => {
      const again = runParentImport({
        parentRecord: recordWith({ orderNo: 'PO-1' }),
        currentParentNos: ['PO-1'],
        currentItems: sourceItems,
      })

      expect(again.validationError).toBeNull()
      expect(again.state.hasImportedCurrentParent).toBe(true)
      expect(again.state.parentNosText).toBe('PO-1')
    })
  })
})
