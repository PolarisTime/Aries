// @vitest-environment jsdom

import i18next from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'

vi.mock('@/components/DocumentReferenceStatusIcons', () => ({
  DocumentReferenceStatusIcons: () => null,
}))

vi.mock(
  '@/module-system/core/module-option-resolvers',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/module-system/core/module-option-resolvers')
      >()
    return { ...actual, findProjectOption: vi.fn() }
  },
)

import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { salesOrdersPageConfig } from './sales-order-page'
import {
  buildAllowedSpecImportWarning,
  collectAllowedSpecViolations,
  warnSalesOrderPurchaseSourceImport,
} from './sales-order-rules'

const findProjectOptionMock = vi.mocked(findProjectOption)

function item(overrides: Record<string, unknown>): ModuleLineItem {
  return { id: '1932500000000000001', ...overrides }
}

function projectOption(allowedBrands: string[], allowedMaterials: string[]) {
  return {
    id: '9001',
    value: '9001',
    label: '项目甲',
    customerId: '1001',
    projectCode: 'XM001',
    projectName: '项目甲',
    allowedBrands,
    allowedMaterials,
  }
}

const currentRecord: ModuleRecordInput = {
  id: '8001',
  customerId: '1001',
  projectId: '9001',
}

describe('collectAllowedSpecViolations', () => {
  it('未配置允许范围时不做任何判定', () => {
    const violations = collectAllowedSpecViolations(
      [item({ brand: '宝钢', material: 'HRB400E' })],
      [],
      [],
    )

    expect(violations).toEqual({ brands: [], materials: [] })
  })

  it('命中允许范围时不报越界', () => {
    const violations = collectAllowedSpecViolations(
      [item({ brand: '沙钢', material: 'HRB400' })],
      ['沙钢', '永钢'],
      ['HRB400'],
    )

    expect(violations).toEqual({ brands: [], materials: [] })
  })

  it('品牌与材质可分别越界且按值去重', () => {
    const violations = collectAllowedSpecViolations(
      [
        item({ brand: '宝钢', material: 'HRB400E' }),
        item({ brand: '宝钢', material: 'HRB500' }),
        item({ brand: ' 中天 ', material: 'HRB400' }),
      ],
      ['沙钢'],
      ['HRB400'],
    )

    expect(violations.brands).toEqual(['宝钢', '中天'])
    expect(violations.materials).toEqual(['HRB400E', 'HRB500'])
  })

  it('明细未填写品牌/材质时跳过，避免误报未维护的数据', () => {
    const violations = collectAllowedSpecViolations(
      [item({ brand: '', material: null }), item({})],
      ['沙钢'],
      ['HRB400'],
    )

    expect(violations).toEqual({ brands: [], materials: [] })
  })

  it('空白与重复的允许值按归一化后比较', () => {
    const violations = collectAllowedSpecViolations(
      [item({ brand: '沙钢' })],
      [' 沙钢 ', '', '沙钢'],
      [],
    )

    expect(violations.brands).toEqual([])
  })
})

describe('buildAllowedSpecImportWarning', () => {
  it('无越界时返回 null', () => {
    expect(
      buildAllowedSpecImportWarning({
        projectLabel: '项目甲',
        violations: { brands: [], materials: [] },
        allowedBrands: ['沙钢'],
        allowedMaterials: [],
      }),
    ).toBeNull()
  })

  it('文案包含项目名、越界值与项目允许范围', () => {
    const warning = buildAllowedSpecImportWarning({
      projectLabel: '项目甲',
      violations: { brands: ['宝钢'], materials: ['HRB400E'] },
      allowedBrands: ['沙钢'],
      allowedMaterials: [],
    })

    expect(warning).toContain('项目甲')
    expect(warning).toContain('宝钢')
    expect(warning).toContain('HRB400E')
    expect(warning).toContain('沙钢')
    expect(warning).toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecImportUnlimited'),
    )
  })

  it('越界值过多时折叠为「等 N 项」，避免消息长到不可读', () => {
    const warning = buildAllowedSpecImportWarning({
      projectLabel: '项目甲',
      violations: {
        brands: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'],
        materials: [],
      },
      allowedBrands: ['沙钢'],
      allowedMaterials: [],
    })

    expect(warning).toContain('B5')
    expect(warning).not.toContain('B6')
    expect(warning).toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecImportMore', { count: 2 }),
    )
  })
})

describe('warnSalesOrderPurchaseSourceImport', () => {
  beforeEach(() => {
    findProjectOptionMock.mockReset()
  })

  it('未选择项目时不做校验', () => {
    expect(
      warnSalesOrderPurchaseSourceImport({
        currentRecord: { id: '8001', customerId: '1001' },
        importedItems: [item({ brand: '宝钢' })],
      }),
    ).toBeNull()
    expect(findProjectOptionMock).not.toHaveBeenCalled()
  })

  it('项目选项缺失时不做校验', () => {
    findProjectOptionMock.mockReturnValue(undefined)

    expect(
      warnSalesOrderPurchaseSourceImport({
        currentRecord,
        importedItems: [item({ brand: '宝钢' })],
      }),
    ).toBeNull()
  })

  it('项目未配置允许品牌/材质时不告警', () => {
    findProjectOptionMock.mockReturnValue(projectOption([], []))

    expect(
      warnSalesOrderPurchaseSourceImport({
        currentRecord,
        importedItems: [item({ brand: '宝钢', material: 'HRB400E' })],
      }),
    ).toBeNull()
  })

  it('导入明细全部匹配时不告警', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], ['HRB400']))

    expect(
      warnSalesOrderPurchaseSourceImport({
        currentRecord,
        importedItems: [item({ brand: '沙钢', material: 'HRB400' })],
      }),
    ).toBeNull()
  })

  it('导入明细越界时返回预警文案', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], ['HRB400']))

    const warning = warnSalesOrderPurchaseSourceImport({
      currentRecord,
      importedItems: [
        item({ brand: '沙钢', material: 'HRB400' }),
        item({ brand: '宝钢', material: 'HRB500' }),
      ],
    })

    expect(warning).toContain('项目甲')
    expect(warning).toContain('宝钢')
    expect(warning).toContain('HRB500')
    expect(findProjectOptionMock).toHaveBeenCalledWith('9001', '1001')
  })
})

describe('销售订单导入采购订单明细的预警接线', () => {
  it('销售订单父单导入已挂载 warnParentImport', () => {
    expect(salesOrdersPageConfig.parentImport?.warnParentImport).toBe(
      warnSalesOrderPurchaseSourceImport,
    )
  })
})
