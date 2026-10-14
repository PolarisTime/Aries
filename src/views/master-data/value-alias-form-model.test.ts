import type { Rule } from 'antd/es/form'
import i18n from 'i18next'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { ValueAliasRecord } from '@/api/master/value-aliases'
import {
  buildValueAliasDimensionOptions,
  buildValueAliasFormRules,
  EMPTY_VALUE_ALIAS_FORM_VALUES,
  findDuplicateSourceAlias,
  formatValueAliasDimension,
  toValueAliasFieldErrors,
  toValueAliasFormValues,
  toValueAliasInputDraft,
  type ValueAliasFormValues,
} from './value-alias-form-model'

const t = i18n.getFixedT('zh-CN')

const record = (
  overrides: Partial<ValueAliasRecord> = {},
): ValueAliasRecord => ({
  id: '1234567890123456789',
  dimension: 'BRAND',
  sourceValue: '万泰',
  targetValue: '浙江万泰',
  remark: null,
  createdAt: '2026-01-02T03:04:05',
  updatedAt: null,
  ...overrides,
})

/** antd 的 `Rule` 是「对象规则 | 渲染函数」联合，这里只处理对象规则。 */
type ValidatorFn = (
  rule: unknown,
  value: unknown,
  callback: (error?: string) => void,
) => unknown

/** 跑单条规则；返回错误文案，通过时返回 null。 */
async function runRule(rules: Rule[], value: unknown): Promise<string | null> {
  const rule = rules[0]
  if (!rule || typeof rule === 'function') {
    throw new Error('规则应为对象形式且包含 validator')
  }
  const validator = rule.validator
  if (typeof validator !== 'function') {
    throw new Error('规则应包含 validator')
  }
  try {
    await (validator as unknown as ValidatorFn)({}, value, () => undefined)
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function buildRules(
  overrides: Partial<ValueAliasFormValues> = {},
  options: { records?: ValueAliasRecord[]; editingId?: string | null } = {},
) {
  const values: ValueAliasFormValues = {
    ...EMPTY_VALUE_ALIAS_FORM_VALUES,
    ...overrides,
  }
  return buildValueAliasFormRules({
    t,
    records: options.records ?? [],
    editingId: options.editingId ?? null,
    getFieldValue: (field) => values[field],
  })
}

describe('维度选项与展示文案', () => {
  it('四个维度都有中文选项，顺序与后端白名单一致', () => {
    expect(buildValueAliasDimensionOptions(t)).toEqual([
      { value: 'CATEGORY', label: '类别' },
      { value: 'MATERIAL', label: '材质' },
      { value: 'LENGTH', label: '定尺' },
      { value: 'BRAND', label: '品牌' },
    ])
  })

  it('未知维度降级展示原值而不是抛错或空白', () => {
    expect(formatValueAliasDimension(t, 'BRAND')).toBe('品牌')
    expect(formatValueAliasDimension(t, 'spec')).toBe('未知维度（spec）')
    expect(formatValueAliasDimension(t, '')).toBe('—')
  })
})

describe('同维度源写法重复检测', () => {
  it('同维度同源写法命中，大小写不同不命中（与后端精确匹配一致）', () => {
    const records = [record()]
    expect(
      findDuplicateSourceAlias(records, {
        dimension: 'BRAND',
        sourceValue: '万泰',
      })?.id,
    ).toBe('1234567890123456789')
    expect(
      findDuplicateSourceAlias(records, {
        dimension: 'brand',
        sourceValue: ' 万泰 ',
      }),
    ).not.toBeNull()
    expect(
      findDuplicateSourceAlias(records, {
        dimension: 'MATERIAL',
        sourceValue: '万泰',
      }),
    ).toBeNull()
  })

  it('编辑自身不算重复', () => {
    const records = [record()]
    expect(
      findDuplicateSourceAlias(records, {
        dimension: 'BRAND',
        sourceValue: '万泰',
        excludeId: '1234567890123456789',
      }),
    ).toBeNull()
  })

  it('空维度或空源写法不做判断', () => {
    const records = [record()]
    expect(
      findDuplicateSourceAlias(records, { dimension: '', sourceValue: '万泰' }),
    ).toBeNull()
    expect(
      findDuplicateSourceAlias(records, {
        dimension: 'BRAND',
        sourceValue: ' ',
      }),
    ).toBeNull()
  })
})

describe('表单校验提示（与后端 422 业务不变量同源）', () => {
  it('维度必选，非法维度给出白名单提示', async () => {
    const rules = buildRules()
    expect(await runRule(rules.dimension, '')).toBe('请选择维度')
    expect(await runRule(rules.dimension, undefined)).toBe('请选择维度')
    expect(await runRule(rules.dimension, 'SPEC')).toBe(
      '维度只能是类别 / 材质 / 定尺 / 品牌',
    )
    expect(await runRule(rules.dimension, 'brand')).toBeNull()
  })

  it('源写法必填、≤64', async () => {
    const rules = buildRules({ dimension: 'BRAND' })
    expect(await runRule(rules.sourceValue, '   ')).toBe('请输入源写法')
    expect(await runRule(rules.targetValue, undefined)).toBe('请输入目标写法')
    expect(await runRule(rules.sourceValue, 'a'.repeat(64))).toBeNull()
    expect(await runRule(rules.sourceValue, 'a'.repeat(65))).toBe(
      '源写法不能超过64个字符',
    )
    expect(await runRule(rules.targetValue, 'b'.repeat(65))).toBe(
      '目标写法不能超过64个字符',
    )
  })

  it('自映射提示（trim 后比较）', async () => {
    const rules = buildRules({ sourceValue: '万泰', targetValue: ' 万泰 ' })
    expect(await runRule(rules.targetValue, ' 万泰 ')).toBe(
      '源写法与目标写法相同，自映射没有意义',
    )
    expect(await runRule(rules.targetValue, '浙江万泰')).toBeNull()
  })

  it('同维度源写法重复提示带上已存在的写法', async () => {
    const rules = buildRules(
      { dimension: 'BRAND', sourceValue: '万泰' },
      { records: [record()] },
    )
    expect(await runRule(rules.sourceValue, '万泰')).toBe(
      '该维度下源写法「万泰」已存在映射，请改为编辑既有记录',
    )
  })

  it('编辑自身时不报重复', async () => {
    const rules = buildRules(
      { dimension: 'BRAND', sourceValue: '万泰' },
      { records: [record()], editingId: '1234567890123456789' },
    )
    expect(await runRule(rules.sourceValue, '万泰')).toBeNull()
  })

  it('备注可空、≤255', async () => {
    const rules = buildRules()
    expect(await runRule(rules.remark, '')).toBeNull()
    expect(await runRule(rules.remark, undefined)).toBeNull()
    expect(await runRule(rules.remark, 'b'.repeat(255))).toBeNull()
    expect(await runRule(rules.remark, 'b'.repeat(256))).toBe(
      '备注不能超过255个字符',
    )
  })
})

describe('表单值与写入载荷互转', () => {
  it('记录回填表单值，备注 null 变空串', () => {
    expect(toValueAliasFormValues(record({ remark: '品牌别名' }))).toEqual({
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰',
      remark: '品牌别名',
    })
    expect(toValueAliasFormValues(record()).remark).toBe('')
  })

  it('表单值 trim 后转写入载荷，空备注不下发', () => {
    expect(
      toValueAliasInputDraft({
        dimension: 'BRAND',
        sourceValue: ' 万泰 ',
        targetValue: ' 浙江万泰 ',
        remark: '   ',
      }),
    ).toEqual({
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰',
    })
  })

  it('Zod issue 按字段归并（同一字段多条不重复）', () => {
    expect(
      toValueAliasFieldErrors([
        { path: ['sourceValue'], message: '源写法不能为空' },
        { path: ['sourceValue'], message: '源写法不能为空' },
        { path: ['remark'], message: '备注不能超过255个字符' },
      ]),
    ).toEqual([
      { name: 'sourceValue', errors: ['源写法不能为空'] },
      { name: 'remark', errors: ['备注不能超过255个字符'] },
    ])
  })

  it('根级 issue 兜底挂到目标写法字段，不静默丢弃', () => {
    expect(
      toValueAliasFieldErrors([{ path: [], message: '整体校验失败' }]),
    ).toEqual([{ name: 'targetValue', errors: ['整体校验失败'] }])
  })
})
