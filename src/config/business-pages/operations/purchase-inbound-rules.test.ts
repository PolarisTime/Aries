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

  describe('validatePurchaseInboundParentImport', () => {
    const firstOrder = recordWith({
      orderNo: 'PO-1',
      supplierId: '1932500000000000011',
      supplierCode: 'S001',
      settlementCompanyId: '1932500000000000021',
    })

    const supplierBase = {
      supplierId: '1932500000000000011',
      supplierCode: 'S001',
      settlementCompanyId: '1932500000000000021',
    }

    const sourceItems: ModuleLineItem[] = [
      {
        id: '1932500000000000101',
        sourcePurchaseOrderItemId: '1932500000000000101',
        quantity: 1,
        pieceWeightTon: 1,
        unitPrice: 100,
      },
    ]

    it('多选来源供应商不一致时提示，不静默覆盖表头', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentRecord: supplierBase,
          currentItems: sourceItems,
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({
            orderNo: 'PO-2',
            supplierId: '1932500000000000012',
            supplierCode: 'S002',
          }),
        }),
      ).toBe('来源采购订单存在不同供应商，不能合并生成采购入库单')
    })

    it('供应商 id 相同但 code 未漂移时放行', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentRecord: supplierBase,
          currentItems: sourceItems,
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({
            orderNo: 'PO-2',
            supplierId: '1932500000000000011',
            supplierCode: 'S001',
            settlementCompanyId: '1932500000000000021',
          }),
        }),
      ).toBeNull()
    })

    it('多选来源结算主体不一致时提示', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentRecord: supplierBase,
          currentItems: sourceItems,
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({
            orderNo: 'PO-2',
            supplierId: '1932500000000000011',
            supplierCode: 'S001',
            settlementCompanyId: '1932500000000000022',
          }),
        }),
      ).toBe('来源采购订单存在不同结算主体，不能合并生成采购入库单')
    })

    it('合并后来源单号超长时提前拦截', () => {
      const currentRecord = { ...supplierBase, purchaseOrderNo: 'PO-1' }
      const longOrderNo = 'X'.repeat(256)
      expect(
        validatePurchaseInboundParentImport({
          currentRecord,
          currentItems: sourceItems,
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({ orderNo: longOrderNo }),
        }),
      ).toBe('合并后的采购订单号长度不能超过 256 个字符')
    })

    it('首次导入（尚无已选来源）跳过一致性校验以保留单选回填路径', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentRecord: {},
          currentItems: [],
          currentParentNos: [],
          parentRecord: firstOrder,
        }),
      ).toBeNull()
    })

    it('删空全部来源明细后允许改选其它供应商，不误拦截', () => {
      expect(
        validatePurchaseInboundParentImport({
          currentRecord: supplierBase,
          currentItems: [
            { id: 'draft-1', quantity: 0, pieceWeightTon: 0, unitPrice: 0 },
          ],
          currentParentNos: ['PO-1'],
          parentRecord: recordWith({
            orderNo: 'PO-3',
            supplierId: '1932500000000000019',
            supplierCode: 'S009',
          }),
        }),
      ).toBeNull()
    })
  })

  describe('采购入库多选合并导入', () => {
    it('页面配置启用多选并接入一致性校验', () => {
      expect(
        purchaseInboundsPageConfig.parentImport?.allowMultipleSelection,
      ).toBe(true)
      expect(
        purchaseInboundsPageConfig.parentImport?.validateParentImport,
      ).toBe(validatePurchaseInboundParentImport)
    })

    it('合并多单时 purchaseOrderNo 为多单号拼接，仅保留首单表头且不取最后一单', () => {
      const commonHeader = {
        supplierId: '1932500000000000011',
        supplierCode: 'S001',
        supplierName: '供应商甲',
        settlementCompanyId: '1932500000000000021',
      }
      const first = runParentImport({
        parentRecord: recordWith({
          id: '1932500000000000011',
          orderNo: 'PO-1',
          ...commonHeader,
          items: [
            {
              id: '1932500000000000101',
              quantity: 1,
              pieceWeightTon: 1,
              unitPrice: 100,
            },
          ],
        }),
      })

      const afterFirstValues = {
        ...first.state.mappedValues,
        purchaseOrderNo: first.state.parentNosText,
      }
      const second = runParentImport({
        parentRecord: recordWith({
          id: '1932500000000000012',
          orderNo: 'PO-2',
          ...commonHeader,
          items: [
            {
              id: '1932500000000000102',
              quantity: 2,
              pieceWeightTon: 1,
              unitPrice: 200,
            },
          ],
        }),
        currentRecord: afterFirstValues,
        currentParentNos: first.state.parentNosText.split(', '),
        currentItems: first.state.nextItems,
      })

      expect(second.validationError).toBeNull()
      expect(second.state.parentNosText).toBe('PO-1, PO-2')
      expect(second.state.shouldApplyMappedValues).toBe(false)
      expect(second.state.mappedValues.supplierName).toBe('供应商甲')
      expect(second.state.nextItems).toHaveLength(2)
    })

    it('多仓库来源合并不改写表头仓库，行级仓库保留各自来源', () => {
      const commonHeader = {
        supplierId: '1932500000000000011',
        supplierCode: 'S001',
        settlementCompanyId: '1932500000000000021',
      }
      const first = runParentImport({
        parentRecord: recordWith({
          id: '1932500000000000011',
          orderNo: 'PO-1',
          warehouseId: '1932500000000000201',
          warehouseName: '一号仓',
          ...commonHeader,
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
      const second = runParentImport({
        parentRecord: recordWith({
          id: '1932500000000000012',
          orderNo: 'PO-2',
          warehouseId: '1932500000000000202',
          warehouseName: '二号仓',
          ...commonHeader,
          items: [
            {
              id: '1932500000000000102',
              warehouseId: '1932500000000000202',
              warehouseName: '二号仓',
              quantity: 1,
              pieceWeightTon: 1,
              unitPrice: 100,
            },
          ],
        }),
        currentRecord: {
          ...first.state.mappedValues,
          purchaseOrderNo: first.state.parentNosText,
        },
        currentParentNos: ['PO-1'],
        currentItems: first.state.nextItems,
      })

      // 表头不携带仓库字段：多仓库由后端按行级 warehouseId 置 null 并命名「多仓库」。
      const headerWarehouseKeys = (
        purchaseInboundsPageConfig.formFields ?? []
      ).flatMap((field) =>
        field.key === 'warehouseId' || field.key === 'warehouseName'
          ? [field.key]
          : [],
      )
      expect(headerWarehouseKeys).toEqual([])
      expect(second.state.mappedValues.warehouseId).toBeUndefined()
      const lineWarehouses = second.state.nextItems.map((item) => ({
        warehouseId: item.warehouseId,
        warehouseName: item.warehouseName,
      }))
      expect(lineWarehouses).toEqual([
        {
          warehouseId: '1932500000000000201',
          warehouseName: '一号仓',
        },
        {
          warehouseId: '1932500000000000202',
          warehouseName: '二号仓',
        },
      ])
    })

    it('单选导入仍回填表头供应商与结算主体', () => {
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
  })
})
