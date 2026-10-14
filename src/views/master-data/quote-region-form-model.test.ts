import type { Rule } from 'antd/es/form'
import i18n from 'i18next'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { QuoteRegionRecord } from '@/api/master/quote-regions'
import {
  buildQuoteRegionFormRules,
  buildQuoteRegionStatusMap,
  buildQuoteRegionStatusOptions,
  EMPTY_QUOTE_REGION_FORM_VALUES,
  findDuplicateRegionName,
  findDuplicateSlug,
  toQuoteRegionFieldErrors,
  toQuoteRegionFormValues,
  toQuoteRegionInputDraft,
} from './quote-region-form-model'

const t = i18n.getFixedT('zh-CN')

const record = (
  overrides: Partial<QuoteRegionRecord> = {},
): QuoteRegionRecord => ({
  id: '1234567890123456789',
  regionName: '杭州',
  slug: 'hangzhou',
  sortOrder: 1,
  status: '正常',
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
  options: { records?: QuoteRegionRecord[]; editingId?: string | null } = {},
) {
  return buildQuoteRegionFormRules({
    t,
    records: options.records ?? [],
    editingId: options.editingId ?? null,
  })
}

describe('状态下拉与标签文案', () => {
  /**
   * 合法状态只有「正常」和「禁用」：后端 `StatusConstants.DISABLED` 取自
   * `DocumentStatus.DISABLED.label()`，V188 已把数据库 CHECK 从「停用」修正为「禁用」。
   * 下拉里再出现「停用」会让提交必然 422。
   */
  it('只有「正常」与「禁用」两个选项', () => {
    const options = buildQuoteRegionStatusOptions(t)
    expect(options).toEqual([
      { value: '正常', label: '正常' },
      { value: '禁用', label: '禁用' },
    ])
    // 「停用」是 V187 的错误文案（V188 已修正为「禁用」），下拉里不得再出现。
    const values: string[] = options.map((option) => option.value)
    const labels: string[] = options.map((option) => option.label)
    expect(values).not.toContain('停用')
    expect(labels).not.toContain('停用')
  })

  it('状态标签元数据只覆盖白名单两个值，未知状态不兜底', () => {
    // 整体相等而不是逐项取键：多出「停用」等第三个键会直接失败。
    expect(buildQuoteRegionStatusMap(t)).toEqual({
      正常: { color: 'green', label: '正常' },
      禁用: { color: 'default', label: '禁用' },
    })
  })
})

describe('城市名/子域名重复检测', () => {
  it('同名城市命中，trim 后比较，大小写不同不命中（与后端精确匹配一致）', () => {
    const records = [record()]
    expect(findDuplicateRegionName(records, '杭州')?.id).toBe(
      '1234567890123456789',
    )
    expect(findDuplicateRegionName(records, ' 杭州 ')).not.toBeNull()
    expect(findDuplicateRegionName(records, '宁波')).toBeNull()
  })

  it('同子域名命中，大小写不同不命中（slug 本身只允许小写）', () => {
    const records = [record()]
    expect(findDuplicateSlug(records, 'hangzhou')?.slug).toBe('hangzhou')
    expect(findDuplicateSlug(records, ' Hangzhou ')).toBeNull()
  })

  it('编辑自身不算重复', () => {
    const records = [record()]
    expect(
      findDuplicateRegionName(records, '杭州', '1234567890123456789'),
    ).toBeNull()
    expect(
      findDuplicateSlug(records, 'hangzhou', '1234567890123456789'),
    ).toBeNull()
  })

  it('空值不做判断', () => {
    const records = [record()]
    expect(findDuplicateRegionName(records, '')).toBeNull()
    expect(findDuplicateRegionName(records, '   ')).toBeNull()
    expect(findDuplicateSlug(records, undefined)).toBeNull()
  })
})

describe('表单校验提示（与后端 422 业务不变量同源）', () => {
  it('城市名称必填、≤32、同名重复提示', async () => {
    const rules = buildRules()
    expect(await runRule(rules.regionName, '')).toBe('请输入城市名称')
    expect(await runRule(rules.regionName, '   ')).toBe('请输入城市名称')
    expect(await runRule(rules.regionName, undefined)).toBe('请输入城市名称')
    expect(await runRule(rules.regionName, 'a'.repeat(32))).toBeNull()
    expect(await runRule(rules.regionName, 'a'.repeat(33))).toBe(
      '城市名称不能超过32个字符',
    )
    expect(
      await runRule(buildRules({ records: [record()] }).regionName, ' 杭州 '),
    ).toBe('城市「杭州」已存在取价地区，请改为编辑既有记录')
  })

  it('子域名必填、≤64、字符集白名单与重复提示', async () => {
    const rules = buildRules()
    expect(await runRule(rules.slug, '')).toBe('请输入子域名')
    expect(await runRule(rules.slug, 'a'.repeat(64))).toBeNull()
    expect(await runRule(rules.slug, 'a'.repeat(65))).toBe(
      '子域名不能超过64个字符',
    )
    // 大写/下划线/中文都不合法：slug 会拼进主机名。
    expect(await runRule(rules.slug, 'Hangzhou')).toBe(
      '子域名只能包含小写字母、数字与连字符',
    )
    expect(await runRule(rules.slug, 'hang_zhou')).toBe(
      '子域名只能包含小写字母、数字与连字符',
    )
    expect(await runRule(rules.slug, '杭州')).toBe(
      '子域名只能包含小写字母、数字与连字符',
    )
    expect(
      await runRule(buildRules({ records: [record()] }).slug, ' hangzhou '),
    ).toBe('子域名「hangzhou」已被其他城市占用，请改为编辑既有记录')
  })

  it('排序号必填、必须为非负整数', async () => {
    const rules = buildRules()
    expect(await runRule(rules.sortOrder, null)).toBe('请输入排序号')
    expect(await runRule(rules.sortOrder, undefined)).toBe('请输入排序号')
    expect(await runRule(rules.sortOrder, '')).toBe('请输入排序号')
    expect(await runRule(rules.sortOrder, 1.5)).toBe('排序号必须为整数')
    expect(await runRule(rules.sortOrder, -1)).toBe('排序号不能为负数')
    expect(await runRule(rules.sortOrder, 0)).toBeNull()
    expect(await runRule(rules.sortOrder, 12)).toBeNull()
  })

  it('状态必选且在白名单内', async () => {
    const rules = buildRules()
    expect(await runRule(rules.status, '')).toBe('请选择状态')
    expect(await runRule(rules.status, undefined)).toBe('请选择状态')
    expect(await runRule(rules.status, '停用')).toBe(
      '状态只能是「正常」或「禁用」',
    )
    expect(await runRule(rules.status, '正常')).toBeNull()
    expect(await runRule(rules.status, ' 禁用 ')).toBeNull()
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

  it('编辑自身时不报重复', async () => {
    const rules = buildRules({
      records: [record()],
      editingId: '1234567890123456789',
    })
    expect(await runRule(rules.regionName, '杭州')).toBeNull()
    expect(await runRule(rules.slug, 'hangzhou')).toBeNull()
  })
})

describe('表单值与写入载荷互转', () => {
  it('记录回填表单值，备注 null 变空串', () => {
    expect(toQuoteRegionFormValues(record({ remark: '原 yml 配置' }))).toEqual({
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 1,
      status: '正常',
      remark: '原 yml 配置',
    })
    expect(toQuoteRegionFormValues(record()).remark).toBe('')
  })

  it('未知状态原样回填（由白名单规则拦住，而不是悄悄改成「正常」）', () => {
    expect(toQuoteRegionFormValues(record({ status: '停用' })).status).toBe(
      '停用',
    )
  })

  it('新增默认值：状态正常、排序号留空', () => {
    expect(EMPTY_QUOTE_REGION_FORM_VALUES).toEqual({
      regionName: '',
      slug: '',
      sortOrder: null,
      status: '正常',
      remark: '',
    })
  })

  it('表单值 trim 后转写入载荷，空备注不下发', () => {
    expect(
      toQuoteRegionInputDraft({
        regionName: ' 杭州 ',
        slug: ' hangzhou ',
        sortOrder: 1,
        status: ' 正常 ',
        remark: '   ',
      }),
    ).toEqual({
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 1,
      status: '正常',
    })
  })

  it('排序号为空时原样下发 null，交给 Zod 报「不能为空」', () => {
    expect(
      toQuoteRegionInputDraft({
        ...EMPTY_QUOTE_REGION_FORM_VALUES,
        regionName: '杭州',
        slug: 'hangzhou',
      }).sortOrder,
    ).toBeNull()
  })

  it('Zod issue 按字段归并（同一字段多条不重复）', () => {
    expect(
      toQuoteRegionFieldErrors([
        { path: ['slug'], message: '子域名不能为空' },
        { path: ['slug'], message: '子域名不能为空' },
        { path: ['remark'], message: '备注不能超过255个字符' },
      ]),
    ).toEqual([
      { name: 'slug', errors: ['子域名不能为空'] },
      { name: 'remark', errors: ['备注不能超过255个字符'] },
    ])
  })

  it('根级 issue 兜底挂到城市名称字段，不静默丢弃', () => {
    expect(
      toQuoteRegionFieldErrors([{ path: [], message: '整体校验失败' }]),
    ).toEqual([{ name: 'regionName', errors: ['整体校验失败'] }])
  })
})
