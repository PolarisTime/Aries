import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock, apiPostMock, apiPutMock, apiDeleteMock } = vi.hoisted(
  () => ({
    apiGetMock: vi.fn(),
    apiPostMock: vi.fn(),
    apiPutMock: vi.fn(),
    apiDeleteMock: vi.fn(),
  }),
)

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  apiDeleteNoContent: apiDeleteMock,
}))

import {
  createValueAlias,
  deleteValueAlias,
  getValueAlias,
  listValueAliases,
  parseValueAliasDimension,
  updateValueAlias,
  VALUE_ALIAS_MAX_REMARK_LENGTH,
  VALUE_ALIAS_MAX_VALUE_LENGTH,
  valueAliasInputSchema,
  valueAliasPageSchema,
} from './value-aliases'

/** 19 位雪花 ID：超出 Number.MAX_SAFE_INTEGER，只有按字符串处理才不会丢低位。 */
const SNOWFLAKE_ID = '1234567890123456789'

const rawRecord = (overrides: Record<string, unknown> = {}) => ({
  id: SNOWFLAKE_ID,
  dimension: 'BRAND',
  sourceValue: '万泰',
  targetValue: '浙江万泰',
  remark: null,
  createdAt: '2026-01-02T03:04:05',
  updatedAt: null,
  ...overrides,
})

const rawPage = (content: unknown[]) => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
})

describe('维度白名单解析', () => {
  it('忽略大小写与首尾空白', () => {
    expect(parseValueAliasDimension('brand')).toBe('BRAND')
    expect(parseValueAliasDimension('  Material ')).toBe('MATERIAL')
  })

  it('非法维度返回 null（读路径不整页失败）', () => {
    expect(parseValueAliasDimension('SPEC')).toBeNull()
    expect(parseValueAliasDimension('')).toBeNull()
    expect(parseValueAliasDimension(null)).toBeNull()
    expect(parseValueAliasDimension(7)).toBeNull()
  })
})

describe('值映射写入契约（Zod 边界）', () => {
  const parse = (input: unknown) => valueAliasInputSchema.safeParse(input)
  const issuesOf = (input: unknown) => {
    const result = parse(input)
    if (result.success) {
      throw new Error('预期校验失败，实际通过')
    }
    return result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }))
  }

  it('维度归一为大写、字符串 trim、空备注省略', () => {
    const result = parse({
      dimension: '  brand ',
      sourceValue: '  万泰 ',
      targetValue: ' 浙江万泰  ',
      remark: '   ',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰',
    })
    expect(result.data && 'remark' in result.data).toBe(false)
  })

  it('空值（含缺失字段）报中文提示', () => {
    expect(
      issuesOf({ dimension: 'BRAND', sourceValue: '', targetValue: 'x' }),
    ).toContainEqual({ path: 'sourceValue', message: '源写法不能为空' })
    expect(
      issuesOf({ dimension: 'BRAND', sourceValue: '   ', targetValue: 'x' }),
    ).toContainEqual({ path: 'sourceValue', message: '源写法不能为空' })
    expect(issuesOf({ dimension: 'BRAND', sourceValue: 'x' })).toContainEqual({
      path: 'targetValue',
      message: '目标写法不能为空',
    })
    expect(issuesOf({ sourceValue: 'x', targetValue: 'y' })).toContainEqual({
      path: 'dimension',
      message: '维度必须是 CATEGORY / MATERIAL / LENGTH / BRAND 之一',
    })
  })

  it('非法维度报白名单提示', () => {
    expect(
      issuesOf({ dimension: 'SPEC', sourceValue: 'x', targetValue: 'y' }),
    ).toContainEqual({
      path: 'dimension',
      message: '维度必须是 CATEGORY / MATERIAL / LENGTH / BRAND 之一',
    })
  })

  it('超长按 64/255 边界判定', () => {
    const exactly64 = 'a'.repeat(VALUE_ALIAS_MAX_VALUE_LENGTH)
    const over64 = 'a'.repeat(VALUE_ALIAS_MAX_VALUE_LENGTH + 1)
    const exactly255 = 'b'.repeat(VALUE_ALIAS_MAX_REMARK_LENGTH)
    const over255 = 'b'.repeat(VALUE_ALIAS_MAX_REMARK_LENGTH + 1)

    expect(
      parse({
        dimension: 'BRAND',
        sourceValue: exactly64,
        targetValue: 'y',
        remark: exactly255,
      }).success,
    ).toBe(true)
    expect(
      issuesOf({ dimension: 'BRAND', sourceValue: over64, targetValue: 'y' }),
    ).toContainEqual({
      path: 'sourceValue',
      message: '源写法不能超过64个字符',
    })
    expect(
      issuesOf({ dimension: 'BRAND', sourceValue: 'x', targetValue: over64 }),
    ).toContainEqual({
      path: 'targetValue',
      message: '目标写法不能超过64个字符',
    })
    expect(
      issuesOf({
        dimension: 'BRAND',
        sourceValue: 'x',
        targetValue: 'y',
        remark: over255,
      }),
    ).toContainEqual({ path: 'remark', message: '备注不能超过255个字符' })
  })

  it('自映射（trim 后相同）报语义错误', () => {
    expect(
      issuesOf({
        dimension: 'BRAND',
        sourceValue: ' 万泰 ',
        targetValue: '万泰',
      }),
    ).toContainEqual({
      path: 'targetValue',
      message: '源写法与目标写法相同，自映射没有意义',
    })
  })
})

describe('分页/详情响应契约（雪花 ID 精度）', () => {
  it('19 位 id 保持十进制字符串，不做 Number 转换', () => {
    const result = valueAliasPageSchema.safeParse(
      rawPage([rawRecord(), rawRecord({ id: '9007199254740993' })]),
    )
    expect(result.success).toBe(true)
    expect(result.data?.content.map((row) => row.id)).toEqual([
      SNOWFLAKE_ID,
      '9007199254740993',
    ])
    expect(typeof result.data?.content[0].id).toBe('string')
  })

  it('数值形态的 id 必须被契约拒绝（不能把数值雪花 ID 固化进契约）', () => {
    // 用最小的安全整数即可说明问题：契约拒绝的是「数值形态」本身。
    // 一旦接受数值，19 位雪花 ID 就会静默丢低位，之后按错误 id 更新/删除。
    const result = valueAliasPageSchema.safeParse(
      rawPage([rawRecord({ id: 12345 })]),
    )
    expect(result.success).toBe(false)
  })

  it('totalElements 兼容后端十进制字符串并归一为数字', () => {
    const result = valueAliasPageSchema.safeParse({
      ...rawPage([rawRecord()]),
      totalElements: '42',
      totalPages: '2',
    })
    expect(result.success).toBe(true)
    expect(result.data?.totalElements).toBe(42)
    expect(result.data?.totalPages).toBe(2)
  })
})

describe('值映射请求函数', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiPutMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('列表带上分页、排序、维度与关键字参数，并归一化记录', async () => {
    apiGetMock.mockResolvedValueOnce(
      rawPage([rawRecord({ remark: '  万泰集团 ' })]),
    )
    const page = await listValueAliases({
      dimension: 'BRAND',
      keyword: ' 万泰 ',
      page: 1,
      size: 30,
    })

    expect(apiGetMock.mock.calls[0][0]).toBe('/value-aliases')
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      page: 1,
      size: 30,
      sortBy: 'id',
      direction: 'desc',
      dimension: 'BRAND',
      keyword: '万泰',
    })
    expect(page.content[0].id).toBe(SNOWFLAKE_ID)
    expect(page.totalElements).toBe(1)
  })

  it('列表未筛选时不下发空维度/空关键字', async () => {
    apiGetMock.mockResolvedValueOnce(rawPage([]))
    await listValueAliases({ keyword: '   ', page: 0, size: 30 })

    expect(apiGetMock.mock.calls[0][2].params).toMatchObject({
      dimension: undefined,
      keyword: undefined,
    })
  })

  it('带 AbortSignal 的详情请求', async () => {
    const controller = new AbortController()
    apiGetMock.mockResolvedValueOnce(rawRecord())
    const record = await getValueAlias(SNOWFLAKE_ID, controller.signal)

    expect(apiGetMock.mock.calls[0][0]).toBe(`/value-aliases/${SNOWFLAKE_ID}`)
    expect(apiGetMock.mock.calls[0][2].signal).toBe(controller.signal)
    expect(record.id).toBe(SNOWFLAKE_ID)
    expect(record.remark).toBeNull()
  })

  it('新增下发归一化后的载荷并携带幂等键', async () => {
    apiPostMock.mockResolvedValueOnce(rawRecord())
    await createValueAlias({
      dimension: 'brand',
      sourceValue: ' 万泰 ',
      targetValue: '浙江万泰',
      remark: ' ',
    })

    expect(apiPostMock.mock.calls[0][0]).toBe('/value-aliases')
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰',
    })
    expect(
      apiPostMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('更新走路径 ID 并携带幂等键', async () => {
    apiPutMock.mockResolvedValueOnce(rawRecord())
    await updateValueAlias(SNOWFLAKE_ID, {
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰',
    })

    expect(apiPutMock.mock.calls[0][0]).toBe(`/value-aliases/${SNOWFLAKE_ID}`)
    expect(
      apiPutMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('删除走 204 无响应体接口并携带幂等键', async () => {
    apiDeleteMock.mockResolvedValueOnce(undefined)
    await deleteValueAlias(SNOWFLAKE_ID)

    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      `/value-aliases/${SNOWFLAKE_ID}`,
    )
    expect(
      apiDeleteMock.mock.calls[0][1].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('非法载荷在发请求前就被拦下（自映射不落到网络层）', async () => {
    await expect(
      createValueAlias({
        dimension: 'BRAND',
        sourceValue: '万泰',
        targetValue: '万泰',
      }),
    ).rejects.toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})
