import { describe, expect, it } from 'vitest'
import type { ModuleItemColumnConfig } from '@/types/module-page'
import {
  defineItemColumnConfig,
  ItemColumnConfigError,
  resolveItemColumnProjection,
  resolveItemColumns,
  resolveModuleItemColumnConfig,
} from './shared-item-column-utils'

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
    expect(resolveItemColumns({ include: ['weightTon'] })[0]).toMatchObject({
      editor: {
        control: 'number',
        precision: 8,
        min: 0,
        controls: false,
      },
    })
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

  it('私有字段按 include 声明顺序参与解析', () => {
    const config = defineItemColumnConfig({
      include: ['brand', 'privateField', 'category'],
      privateColumns: [
        { title: '私有列', dataIndex: 'privateField', width: 90 },
      ],
    })
    const columns = resolveItemColumns(config)
    expect(columns.map((column) => column.dataIndex)).toEqual([
      'brand',
      'privateField',
      'category',
    ])
  })

  it('未将私有字段加入 include 时快速失败', () => {
    const config = defineItemColumnConfig({
      include: ['brand'],
      privateColumns: [
        { title: '私有列', dataIndex: 'privateField', width: 90 },
      ],
    })
    expect(() => resolveItemColumns(config)).toThrowError(
      /私有字段不在 include 白名单中/,
    )
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
    const config = defineItemColumnConfig({
      include: ['brand', 'privateField'],
      privateColumns: [
        { title: '私有列', dataIndex: 'privateField', width: 90 },
      ],
      projections: { detail: ['privateField'] },
    })
    // @ts-expect-error 未声明的私有字段不能进入投影类型
    const invalidProjection = ['unknownPrivateField'] satisfies NonNullable<
      typeof config.projections
    >['detail']
    void invalidProjection
    const columns = resolveItemColumnProjection(config, ['privateField'])
    expect(columns?.map((column) => column.dataIndex)).toEqual(['privateField'])
  })

  it('投影字段不在 include 白名单且非私有字段时快速失败', () => {
    expect(() =>
      resolveItemColumnProjection(baseConfig, ['quantity']),
    ).toThrowError(/投影字段不在 include 白名单中/)
  })

  it('统一工厂解析编辑器、详情与保存结果列，避免手写出口漂移', () => {
    const resolved = resolveModuleItemColumnConfig({
      include: ['brand', 'category'],
      projections: {
        detail: ['category'],
        saveResult: ['brand'],
      },
    })
    expect(resolved.itemColumns.map((column) => column.dataIndex)).toEqual([
      'brand',
      'category',
    ])
    expect(
      resolved.detailItemColumns?.map((column) => column.dataIndex),
    ).toEqual(['category'])
    expect(
      resolved.saveResultItemColumns?.map((column) => column.dataIndex),
    ).toEqual(['brand'])
  })
})
