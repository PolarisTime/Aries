// @vitest-environment jsdom

import i18next from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'

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
import {
  buildAllowedSpecItemWarning,
  resolveSalesOrderItemScopeCheck,
} from './sales-order-rules'

const findProjectOptionMock = vi.mocked(findProjectOption)

function item(overrides: Record<string, unknown>): ModuleLineItem {
  return { id: '1932500000000000001', ...overrides }
}

function projectOption(
  allowedBrands: string[],
  allowedMaterials: string[],
  allowedBrandSeverity?: 'OFF' | 'WARN' | 'BLOCK',
  allowedMaterialSeverity?: 'OFF' | 'WARN' | 'BLOCK',
) {
  return {
    id: '9001',
    value: '9001',
    label: '项目甲',
    customerId: '1001',
    projectCode: 'XM001',
    projectName: '项目甲',
    allowedBrands,
    allowedMaterials,
    ...(allowedBrandSeverity ? { allowedBrandSeverity } : {}),
    ...(allowedMaterialSeverity ? { allowedMaterialSeverity } : {}),
  }
}

const currentRecord: ModuleRecordInput = {
  id: '8001',
  customerId: '1001',
  projectId: '9001',
}

describe('resolveSalesOrderItemScopeCheck', () => {
  beforeEach(() => {
    findProjectOptionMock.mockReset()
  })

  it('允许清单为空表示不限制: 单行越界也不提示', () => {
    findProjectOptionMock.mockReturnValue(projectOption([], []))

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢', material: 'HRB400E' }),
    })

    expect(check.message).toBeNull()
    expect(check.blocked).toBe(false)
    expect(check.violations).toEqual({ brands: [], materials: [] })
  })

  it('力度 OFF 时不提示(清单仅作参考)', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'OFF', 'OFF'),
    )

    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord,
        item: item({ brand: '宝钢', material: 'HRB500' }),
      }).message,
    ).toBeNull()
  })

  it('单行全部命中允许范围时不提示', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], ['HRB400']))

    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord,
        item: item({ brand: ' 沙钢 ', material: 'HRB400' }),
      }).message,
    ).toBeNull()
  })

  it('明细该维度无值时跳过: 缺品牌不误报, 缺材质只判品牌', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], ['HRB400']))

    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord,
        item: item({ brand: '', material: null }),
      }).message,
    ).toBeNull()

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢' }),
    })
    expect(check.violations).toEqual({ brands: ['宝钢'], materials: [] })
    expect(check.message).toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecImportBrands', {
        values: '宝钢',
      }),
    )
    // 未填写的材质不进入越界明细（项目允许范围段落里的「材质」不算）
    expect(check.message).not.toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecImportMaterials', {
        values: 'HRB400',
      }),
    )
  })

  it('品牌越界且力度为 WARN: 只提示, 文案不含阻断措辞', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢' }),
    })

    expect(check.blocked).toBe(false)
    expect(check.message).toContain('项目甲')
    expect(check.message).toContain('宝钢')
    expect(check.message).toContain('沙钢')
    expect(check.message).not.toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecItemBlockedSuffix'),
    )
    // 行级提示不能沿用导入话术, 否则用户会以为自己在做导入
    expect(check.message).not.toContain('导入')
  })

  it('力度为 BLOCK: 文案明确「保存时会被拦截」', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'BLOCK', 'WARN'),
    )

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢' }),
    })

    expect(check.blocked).toBe(true)
    expect(check.message).toContain('保存时会被拦截')
    expect(check.message).toContain('宝钢')
  })

  it('服务端未下发力度时按提醒处理(兼容升级前数据)', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], []))

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢' }),
    })

    expect(check.blocked).toBe(false)
    expect(check.message).toContain('宝钢')
    expect(check.message).not.toContain('保存时会被拦截')
  })

  it('维度力度互相独立: 品牌 OFF 不影响材质判定', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'OFF', 'BLOCK'),
    )

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢', material: 'HRB500' }),
    })

    expect(check.violations).toEqual({ brands: [], materials: ['HRB500'] })
    expect(check.blocked).toBe(true)
    expect(check.message).toContain('HRB500')
    expect(check.message).not.toContain('宝钢')
  })

  it('项目未选择时不判定, 也不去查项目', () => {
    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord: { id: '8001', customerId: '1001' },
        item: item({ brand: '宝钢' }),
      }).message,
    ).toBeNull()
    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord: { id: '8001', projectId: '9001' },
        item: item({ brand: '宝钢' }),
      }).message,
    ).toBeNull()
    expect(findProjectOptionMock).not.toHaveBeenCalled()
  })

  it('项目查不到时不判定', () => {
    findProjectOptionMock.mockReturnValue(undefined)

    expect(
      resolveSalesOrderItemScopeCheck({
        currentRecord,
        item: item({ brand: '宝钢' }),
      }).message,
    ).toBeNull()
    expect(findProjectOptionMock).toHaveBeenCalledWith('9001', '1001')
  })

  it('判定口径与导入路径同源: 返回的越界值集合一致', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'WARN', 'WARN'),
    )

    const check = resolveSalesOrderItemScopeCheck({
      currentRecord,
      item: item({ brand: '宝钢', material: 'HRB500' }),
    })

    expect(check.violations).toEqual({
      brands: ['宝钢'],
      materials: ['HRB500'],
    })
    expect(check.allowedBrands).toEqual(['沙钢'])
    expect(check.allowedMaterials).toEqual(['HRB400'])
    expect(check.projectLabel).toBe('项目甲')
  })
})

describe('buildAllowedSpecItemWarning', () => {
  it('无越界时返回 null', () => {
    expect(
      buildAllowedSpecItemWarning({
        projectLabel: '项目甲',
        violations: { brands: [], materials: [] },
        allowedBrands: ['沙钢'],
        allowedMaterials: [],
      }),
    ).toBeNull()
  })

  it('复用允许范围文案: 含项目名、越界值与项目允许清单', () => {
    const warning = buildAllowedSpecItemWarning({
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
    expect(warning).toContain(
      i18next.t('modules.pages.salesOrder.allowedSpecImportScope', {
        brands: '沙钢',
        materials: i18next.t(
          'modules.pages.salesOrder.allowedSpecImportUnlimited',
        ),
      }),
    )
  })
})
