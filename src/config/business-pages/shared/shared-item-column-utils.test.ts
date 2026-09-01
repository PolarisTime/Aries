import { describe, expect, it } from 'vitest'
import type {
  ModuleColumnDefinition,
  ModuleItemColumnConfig,
} from '@/types/module-page'
import {
  ItemColumnConfigError,
  resolveItemColumnProjection,
  resolveItemColumns,
} from './shared-item-column-utils'
import type { TradeLineItemFieldKey } from './trade-line-item-field-catalog'

const baseConfig: ModuleItemColumnConfig = {
  include: ['brand', 'category', 'material', 'spec', 'length', 'unit'],
  requiredFieldKeys: ['brand', 'material', 'unit'],
}

describe('resolveItemColumns', () => {
  it('按 include 顺序解析字段并应用必填语义与基础展示属性', () => {
    const columns = resolveItemColumns(baseConfig)

    expect(
      columns.map((column) => ({
        dataIndex: column.dataIndex,
        required: column.required === true,
      })),
    ).toEqual([
      { dataIndex: 'brand', required: true },
      { dataIndex: 'category', required: false },
      { dataIndex: 'material', required: true },
      { dataIndex: 'spec', required: false },
      { dataIndex: 'length', required: false },
      { dataIndex: 'unit', required: true },
    ])
    // 宽度/对齐/类型来自公共目录
    expect(columns[0]).toMatchObject({ width: 68, align: 'center' })
    expect(columns[4].width).toBe(64)
  })

  it('空白配置解析为空数组', () => {
    expect(resolveItemColumns({ include: [] })).toEqual([])
  })

  it('未知字段 key 快速失败', () => {
    expect(() =>
      resolveItemColumns({ include: ['brand', 'unknownKey' as never] }),
    ).toThrowError(ItemColumnConfigError)
    expect(() =>
      resolveItemColumns({ include: ['brand', 'unknownKey' as never] }),
    ).toThrowError(/未知明细字段 key/)
  })

  it('重复字段 key 快速失败', () => {
    expect(() =>
      resolveItemColumns({ include: ['brand', 'brand'] }),
    ).toThrowError(/重复明细字段 key/)
  })

  it('私有字段追加到白名单之后', () => {
    const columns = resolveItemColumns({
      include: ['brand', 'category'],
      privateColumns: [
        {
          title: '私有列',
          dataIndex: 'privateField',
          width: 90,
        } satisfies ModuleColumnDefinition,
      ],
    })
    expect(columns.map((column) => column.dataIndex)).toEqual([
      'brand',
      'category',
      'privateField',
    ])
  })

  it('私有字段与白名单冲突快速失败', () => {
    expect(() =>
      resolveItemColumns({
        include: ['brand'],
        privateColumns: [{ title: '冲突', dataIndex: 'brand', width: 90 }],
      }),
    ).toThrowError(/私有字段与白名单冲突/)
  })

  it('覆盖字段必须存在于公共目录', () => {
    expect(() =>
      resolveItemColumns({
        include: ['brand'],
        overrides: {
          unknownField: { width: 100 },
        } as ModuleItemColumnConfig['overrides'],
      }),
    ).toThrowError(/覆盖目标不存在/)
  })

  it('覆盖字段必须属于 include 白名单', () => {
    expect(() =>
      resolveItemColumns({
        include: ['brand'],
        overrides: { category: { width: 100 } },
      }),
    ).toThrowError(/覆盖字段不在 include 白名单中/)
  })

  it('覆盖展示属性生效', () => {
    const columns = resolveItemColumns({
      include: ['brand'],
      overrides: { brand: { width: 92, align: 'right' } },
    })
    expect(columns[0]).toMatchObject({
      dataIndex: 'brand',
      width: 92,
      align: 'right',
    })
  })

  it('默认隐藏字段必须属于 include 白名单', () => {
    expect(() =>
      resolveItemColumns({
        include: ['brand'],
        hiddenByDefault: ['category'],
      }),
    ).toThrowError(/默认隐藏字段不在 include 白名单中/)
  })

  it('必填字段必须属于 include 白名单', () => {
    expect(() =>
      resolveItemColumns({
        include: ['brand'],
        requiredFieldKeys: ['category'],
      }),
    ).toThrowError(/必填字段不在 include 白名单中/)
  })

  it('未声明 include 的字段不会输出（影响范围受控）', () => {
    const columns = resolveItemColumns({ include: ['brand'] })
    expect(columns.map((column) => column.dataIndex)).toEqual(['brand'])
  })
})

describe('resolveItemColumnProjection', () => {
  it('未声明投影返回 undefined（由调用方回退到完整列）', () => {
    expect(resolveItemColumnProjection(baseConfig, undefined)).toBeUndefined()
  })

  it('投影按声明顺序输出子集', () => {
    const columns = resolveItemColumnProjection(baseConfig, ['length', 'brand'])
    expect(columns?.map((column) => column.dataIndex)).toEqual([
      'length',
      'brand',
    ])
  })

  it('投影可引用私有字段', () => {
    const columns = resolveItemColumnProjection(
      {
        include: ['brand'],
        privateColumns: [
          { title: '私有列', dataIndex: 'privateField', width: 90 },
        ],
      },
      ['privateField' as TradeLineItemFieldKey],
    )
    expect(columns?.map((column) => column.dataIndex)).toEqual(['privateField'])
  })

  it('投影字段不在 include 白名单且非私有字段时快速失败', () => {
    expect(() =>
      resolveItemColumnProjection(baseConfig, ['quantity']),
    ).toThrowError(/投影字段不在 include 白名单中/)
  })
})
