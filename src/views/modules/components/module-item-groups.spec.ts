import { describe, expect, it } from 'vitest'
import type { ModuleLineItem } from '@/types/module-page'
import {
  buildModuleItemGroups,
  getModuleItemGroupStrategy,
  resolveModuleItemGroupViewKind,
} from './module-item-groups'

function lineItem(overrides: Partial<ModuleLineItem>): ModuleLineItem {
  return { id: '1', ...overrides }
}

describe('buildModuleItemGroups', () => {
  it('未注册策略的模块回退为单一全量分组', () => {
    const items = [lineItem({ id: '1', sourceNo: 'SO-1' })]
    const groups = buildModuleItemGroups('sales-order', items)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ key: 'all', totalQuantity: 0 })
    expect((groups[0] as { items: ModuleLineItem[] }).items).toEqual(items)
  })

  it('客户对账单按来源单分组，空明细回退为对账单形态空分组', () => {
    const groups = buildModuleItemGroups('customer-statement', [
      lineItem({ id: '1', sourceNo: 'SO-1' }),
    ])
    expect(groups.length).toBeGreaterThan(0)

    const emptyGroups = buildModuleItemGroups('customer-statement', [])
    expect(emptyGroups).toEqual([
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
    ])
  })

  it('物流对账单空明细回退为默认形态空分组', () => {
    const emptyGroups = buildModuleItemGroups('freight-statement', [])
    expect(emptyGroups).toEqual([
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
    ])
  })

  it('未知模块 key 回退为单一全量分组与默认空分组', () => {
    expect(getModuleItemGroupStrategy('unknown-module')).toBeUndefined()
    const groups = buildModuleItemGroups('unknown-module', [])
    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('all')
  })
})

describe('resolveModuleItemGroupViewKind', () => {
  const plainGroup = buildModuleItemGroups('sales-order', [
    lineItem({ id: '1' }),
  ])[0]

  it('物流单固定按项目分组渲染', () => {
    expect(resolveModuleItemGroupViewKind('freight-bill', plainGroup)).toBe(
      'freight-project',
    )
  })

  it('客户对账单使用专属表头，其余模块按分组结构回退', () => {
    expect(
      resolveModuleItemGroupViewKind('customer-statement', plainGroup),
    ).toBe('customer-statement')
    expect(resolveModuleItemGroupViewKind('sales-order', plainGroup)).toBe(
      'plain',
    )
    expect(resolveModuleItemGroupViewKind('unknown-module', plainGroup)).toBe(
      'plain',
    )
  })

  it('含 projectGroups 的分组按物流对账单渲染', () => {
    const freightGroup = {
      key: 'fb-1',
      projectGroups: [],
    } as unknown as Parameters<typeof resolveModuleItemGroupViewKind>[1]
    expect(resolveModuleItemGroupViewKind('sales-order', freightGroup)).toBe(
      'freight-statement',
    )
    expect(resolveModuleItemGroupViewKind('freight-bill', freightGroup)).toBe(
      'freight-project',
    )
  })
})
