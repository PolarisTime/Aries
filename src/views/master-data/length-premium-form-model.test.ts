import type { Rule } from 'antd/es/form'
import i18n from 'i18next'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import type { LengthPremiumRecord } from '@/api/master/length-premiums'
import { lengthPremiumInputSchema } from '@/api/master/length-premiums'
import {
  buildLengthPremiumFormRules,
  buildLengthPremiumStatusMap,
  buildLengthPremiumStatusOptions,
  EMPTY_LENGTH_PREMIUM_FORM_VALUES,
  findDuplicateLengthName,
  formatPremium,
  toLengthPremiumFieldErrors,
  toLengthPremiumFormValues,
  toLengthPremiumInputDraft,
} from './length-premium-form-model'

const t = i18n.getFixedT('zh-CN')

const record = (
  overrides: Partial<LengthPremiumRecord> = {},
): LengthPremiumRecord => ({
  id: '1234567890123456789',
  lengthName: '12米',
  premium: 30,
  sortOrder: 1,
  status: '正常',
  remark: null,
  specSuffix: '*12',
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
  options: { records?: LengthPremiumRecord[]; editingId?: string | null } = {},
) {
  return buildLengthPremiumFormRules({
    t,
    records: options.records ?? [],
    editingId: options.editingId ?? null,
  })
}

describe('状态下拉与标签文案', () => {
  it('只有「正常」与「禁用」两个选项', () => {
    const options = buildLengthPremiumStatusOptions(t)
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
    expect(buildLengthPremiumStatusMap(t)).toEqual({
      正常: { color: 'green', label: '正常' },
      禁用: { color: 'default', label: '禁用' },
    })
  })
})

describe('加价展示口径', () => {
  /** 正数带 `+`、负数带 `-`：让「加价 / 优惠」一眼可分，列与测试共用一个口径函数。 */
  it('正数带加号、负数带减号、为空显示占位符', () => {
    expect(formatPremium(30)).toBe('+30')
    expect(formatPremium(-30)).toBe('-30')
    expect(formatPremium(0)).toBe('0')
    expect(formatPremium(null)).toBe('—')
    expect(formatPremium(undefined)).toBe('—')
    expect(formatPremium('')).toBe('—')
  })
})

describe('定尺名称重复检测', () => {
  it('同名命中、trim 后比较、大小写不同不命中', () => {
    const records = [record()]
    expect(findDuplicateLengthName(records, '12米')?.id).toBe(
      '1234567890123456789',
    )
    expect(findDuplicateLengthName(records, ' 12米 ')).not.toBeNull()
    expect(findDuplicateLengthName(records, '9米')).toBeNull()
  })

  it('编辑自身不算重复', () => {
    const records = [record()]
    expect(
      findDuplicateLengthName(records, '12米', '1234567890123456789'),
    ).toBeNull()
  })

  it('空值不做判断', () => {
    const records = [record()]
    expect(findDuplicateLengthName(records, '')).toBeNull()
    expect(findDuplicateLengthName(records, '   ')).toBeNull()
    expect(findDuplicateLengthName(records, undefined)).toBeNull()
  })
})

describe('表单校验提示（与后端 422 业务不变量同源）', () => {
  it('定尺名称必填、≤32、同名重复提示', async () => {
    const rules = buildRules()
    expect(await runRule(rules.lengthName, '')).toBe('请输入定尺名称')
    expect(await runRule(rules.lengthName, '   ')).toBe('请输入定尺名称')
    expect(await runRule(rules.lengthName, undefined)).toBe('请输入定尺名称')
    expect(await runRule(rules.lengthName, 'a'.repeat(32))).toBeNull()
    expect(await runRule(rules.lengthName, 'a'.repeat(33))).toBe(
      '定尺名称不能超过32个字符',
    )
    expect(
      await runRule(buildRules({ records: [record()] }).lengthName, ' 12米 '),
    ).toBe('定尺「12米」已存在加价规则，请改为编辑既有记录')
  })

  /**
   * 负加价是合法业务值（优惠），表单规则不得把它当成非法输入 —— 只有超区间才报错。
   */
  it('加价必填、必须为整数、区间 -100000..100000（负值合法）', async () => {
    const rules = buildRules()
    expect(await runRule(rules.premium, null)).toBe('请输入加价')
    expect(await runRule(rules.premium, undefined)).toBe('请输入加价')
    expect(await runRule(rules.premium, '')).toBe('请输入加价')
    expect(await runRule(rules.premium, 30.5)).toBe('加价必须为整数')

    expect(await runRule(rules.premium, -30)).toBeNull()
    expect(await runRule(rules.premium, -1)).toBeNull()
    expect(await runRule(rules.premium, 0)).toBeNull()
    expect(await runRule(rules.premium, 100000)).toBeNull()
    expect(await runRule(rules.premium, -100000)).toBeNull()
    expect(await runRule(rules.premium, -100001)).toBe('加价不能小于 -100000')
    expect(await runRule(rules.premium, 100001)).toBe('加价不能大于 100000')
  })

  it('排序号必填、必须为非负整数', async () => {
    const rules = buildRules()
    expect(await runRule(rules.sortOrder, null)).toBe('请输入排序号')
    expect(await runRule(rules.sortOrder, undefined)).toBe('请输入排序号')
    expect(await runRule(rules.sortOrder, 1.5)).toBe('排序号必须为整数')
    expect(await runRule(rules.sortOrder, -1)).toBe('排序号不能为负数')
    expect(await runRule(rules.sortOrder, 0)).toBeNull()
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

  it('规格后缀可空、≤16（空串是合法的「不追加」）', async () => {
    const rules = buildRules()
    expect(await runRule(rules.specSuffix, '')).toBeNull()
    expect(await runRule(rules.specSuffix, undefined)).toBeNull()
    expect(await runRule(rules.specSuffix, '*12')).toBeNull()
    expect(await runRule(rules.specSuffix, '*'.repeat(16))).toBeNull()
    expect(await runRule(rules.specSuffix, '*'.repeat(17))).toBe(
      '打印规格后缀不能超过16个字符',
    )
  })

  it('编辑自身时不报重复', async () => {
    const rules = buildRules({
      records: [record()],
      editingId: '1234567890123456789',
    })
    expect(await runRule(rules.lengthName, '12米')).toBeNull()
  })
})

describe('表单值与写入载荷互转', () => {
  it('记录回填表单值，备注 null 变空串，负加价原样回填，后缀原样回填', () => {
    expect(
      toLengthPremiumFormValues(record({ premium: -20, remark: '优惠' })),
    ).toEqual({
      lengthName: '12米',
      premium: -20,
      sortOrder: 1,
      status: '正常',
      remark: '优惠',
      specSuffix: '*12',
    })
    expect(toLengthPremiumFormValues(record()).remark).toBe('')
  })

  it('旧记录没有规格后缀时回填空串（显式「无后缀」，不是 undefined）', () => {
    expect(
      toLengthPremiumFormValues(record({ specSuffix: null })).specSuffix,
    ).toBe('')
  })

  it('未知状态原样回填（由白名单规则拦住，而不是悄悄改成「正常」）', () => {
    expect(toLengthPremiumFormValues(record({ status: '停用' })).status).toBe(
      '停用',
    )
  })

  it('新增默认值：状态正常、加价与排序号留空、后缀为空', () => {
    expect(EMPTY_LENGTH_PREMIUM_FORM_VALUES).toEqual({
      lengthName: '',
      premium: null,
      sortOrder: null,
      status: '正常',
      remark: '',
      specSuffix: '',
    })
  })

  it('表单值 trim 后转写入载荷，空备注不下发，负加价保留符号，后缀 trim 后下发', () => {
    expect(
      toLengthPremiumInputDraft({
        lengthName: ' 12米 ',
        premium: -30,
        sortOrder: 2,
        status: ' 正常 ',
        remark: '   ',
        specSuffix: '  *12  ',
      }),
    ).toEqual({
      lengthName: '12米',
      premium: -30,
      sortOrder: 2,
      status: '正常',
      specSuffix: '*12',
    })
  })

  /**
   * 与备注相反：后缀**空串也必须回传** —— 后端更新语义是 null=保持、''=清空，
   * 省略字段会让用户在页面上清空后缀却清不掉。
   */
  it('规格后缀为空串时仍然下发（显式清空），不会被省略', () => {
    const draft = toLengthPremiumInputDraft({
      ...EMPTY_LENGTH_PREMIUM_FORM_VALUES,
      lengthName: '12米',
      premium: 30,
      sortOrder: 1,
    })
    expect('specSuffix' in draft).toBe(true)
    expect(draft.specSuffix).toBe('')
    // Zod 收口后依然保留该字段（写路径唯一口径）。
    const parsed = lengthPremiumInputSchema.parse(draft)
    expect(parsed.specSuffix).toBe('')
  })

  it('规格后缀超过 16 字符时 schema 拒绝', () => {
    const result = lengthPremiumInputSchema.safeParse({
      lengthName: '12米',
      premium: 30,
      sortOrder: 1,
      status: '正常',
      specSuffix: '*'.repeat(17),
    })
    expect(result.success).toBe(false)
    expect(
      result.success ? [] : result.error.issues.map((issue) => issue.message),
    ).toContain('打印规格后缀不能超过16个字符')
  })

  it('加价为空时原样下发 null，交给 Zod 报「不能为空」', () => {
    const draft = toLengthPremiumInputDraft({
      ...EMPTY_LENGTH_PREMIUM_FORM_VALUES,
      lengthName: '12米',
      sortOrder: 1,
    })
    expect(draft.premium).toBeNull()
    expect(draft.sortOrder).toBe(1)
  })

  it('Zod issue 按字段归并（同一字段多条不重复）', () => {
    expect(
      toLengthPremiumFieldErrors([
        { path: ['premium'], message: '加价不能为空' },
        { path: ['premium'], message: '加价不能为空' },
        { path: ['remark'], message: '备注不能超过255个字符' },
      ]),
    ).toEqual([
      { name: 'premium', errors: ['加价不能为空'] },
      { name: 'remark', errors: ['备注不能超过255个字符'] },
    ])
  })

  it('根级 issue 兜底挂到定尺名称字段，不静默丢弃', () => {
    expect(
      toLengthPremiumFieldErrors([{ path: [], message: '整体校验失败' }]),
    ).toEqual([{ name: 'lengthName', errors: ['整体校验失败'] }])
  })
})
