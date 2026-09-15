import { describe, expect, it } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { createStructuredMaterialFilterOption } from '@/utils/pinyin-search'
import {
  buildMaterialSelectOptions,
  buildMaterialSnapshotLabel,
  mergeMaterialRecords,
  withCurrentMaterialOption,
} from './module-editor-material-options'

const material = (
  id: string,
  overrides: Record<string, unknown> = {},
): ModuleRecord => ({
  id,
  materialCode: `M-${id}`,
  brand: '泸钢',
  category: '盘螺',
  material: 'HRB400E',
  spec: '8',
  length: '-',
  ...overrides,
})

describe('buildMaterialSnapshotLabel', () => {
  it('按品牌 | 类别 | 材质 | 规格 | 长度拼接展示标签', () => {
    expect(buildMaterialSnapshotLabel(material('1'))).toBe(
      '泸钢 | 盘螺 | HRB400E | 8 | -',
    )
  })

  it('品牌为空时回退到商品名称', () => {
    expect(
      buildMaterialSnapshotLabel(
        material('1', { brand: '', materialName: '螺纹钢' }),
      ),
    ).toBe('螺纹钢 | 盘螺 | HRB400E | 8 | -')
  })
})

describe('buildMaterialSelectOptions', () => {
  it('缺少主键或商品编码的脏数据不进入候选', () => {
    expect(
      buildMaterialSelectOptions([
        material('1', { materialCode: '' }),
        { id: undefined as unknown as string, materialCode: 'M-X' },
        material('2'),
      ]).map((option) => option.value),
    ).toEqual(['2'])
  })

  it('按主键去重并输出字符串主键', () => {
    const options = buildMaterialSelectOptions([
      material('1'),
      material('1', { spec: '10' }),
    ])
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('1')
    expect(options[0].spec).toBe('8')
  })
})

describe('mergeMaterialRecords', () => {
  it('远程搜索结果优先并与本地预加载去重', () => {
    const preloaded = [material('1'), material('2')]
    const remote = [material('2'), material('297')]
    expect(mergeMaterialRecords(remote, preloaded).map((r) => r.id)).toEqual([
      '2',
      '297',
      '1',
    ])
  })

  it('忽略缺少主键的记录', () => {
    expect(
      mergeMaterialRecords(
        [{ id: undefined as unknown as string }],
        [material('1')],
      ).map((r) => r.id),
    ).toEqual(['1'])
  })
})

describe('withCurrentMaterialOption', () => {
  it('已有候选项时不重复追加', () => {
    const options = buildMaterialSelectOptions([material('1')])
    expect(
      withCurrentMaterialOption(options, { id: 'row-1', materialId: '1' }),
    ).toBe(options)
  })

  it('历史快照不在候选中时补禁用回显项', () => {
    const rowItem: ModuleLineItem = {
      id: 'row-1',
      materialId: '297',
      brand: '泸钢',
      category: '盘螺',
      material: 'HRB400E',
      spec: '8',
      length: '-',
    }
    const [fallback] = withCurrentMaterialOption([], rowItem)
    expect(fallback).toMatchObject({
      value: '297',
      disabled: true,
      label: '泸钢 | 盘螺 | HRB400E | 8 | -',
    })
  })

  it('历史快照没有可读标签时不补选项', () => {
    expect(
      withCurrentMaterialOption([], {
        id: 'row-1',
        materialId: '297',
      }),
    ).toEqual([])
  })
})

describe('商品下拉远程搜索回归', () => {
  it('第 297 位的泸钢在本地预加载缺失时仍可被搜索命中', () => {
    const preloaded = Array.from({ length: 200 }, (_, index) =>
      material(String(index + 1), { brand: `品牌${index + 1}` }),
    )
    const lugang = material('297')
    const options = buildMaterialSelectOptions(
      mergeMaterialRecords([lugang], preloaded),
    )
    const filterMaterial = createStructuredMaterialFilterOption()

    expect(
      options.filter((option) => filterMaterial('泸钢', option)),
    ).toHaveLength(1)
    expect(
      options.filter((option) => filterMaterial('泸钢', option))[0].value,
    ).toBe('297')
  })
})
