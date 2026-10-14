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
  createLengthPremium,
  deleteLengthPremium,
  getLengthPremium,
  LENGTH_PREMIUM_MAX,
  LENGTH_PREMIUM_MAX_NAME_LENGTH,
  LENGTH_PREMIUM_MAX_REMARK_LENGTH,
  LENGTH_PREMIUM_MIN,
  lengthPremiumInputSchema,
  lengthPremiumPageSchema,
  listLengthPremiums,
  parseLengthPremiumStatus,
  updateLengthPremium,
} from './length-premiums'

/** 19 位雪花 ID：超出 Number.MAX_SAFE_INTEGER，只有按字符串处理才不会丢低位。 */
const SNOWFLAKE_ID = '1234567890123456789'

const rawRecord = (overrides: Record<string, unknown> = {}) => ({
  id: SNOWFLAKE_ID,
  lengthName: '12米',
  premium: 30,
  sortOrder: 1,
  status: '正常',
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

const validInput = (overrides: Record<string, unknown> = {}) => ({
  lengthName: '12米',
  premium: 30,
  sortOrder: 1,
  status: '正常',
  ...overrides,
})

describe('状态白名单解析（正常 / 禁用）', () => {
  it('忽略首尾空白，合法值原样返回', () => {
    expect(parseLengthPremiumStatus('正常')).toBe('正常')
    expect(parseLengthPremiumStatus(' 禁用 ')).toBe('禁用')
  })

  it('「停用」不是合法状态（后端与数据库 CHECK 都是「禁用」）', () => {
    expect(parseLengthPremiumStatus('停用')).toBeNull()
    expect(parseLengthPremiumStatus('DISABLED')).toBeNull()
  })

  it('非法/空值返回 null（读路径不整页失败）', () => {
    expect(parseLengthPremiumStatus('')).toBeNull()
    expect(parseLengthPremiumStatus('   ')).toBeNull()
    expect(parseLengthPremiumStatus(null)).toBeNull()
    expect(parseLengthPremiumStatus(undefined)).toBeNull()
    expect(parseLengthPremiumStatus(7)).toBeNull()
  })
})

describe('定尺加价写入契约（Zod 边界）', () => {
  const parse = (input: unknown) => lengthPremiumInputSchema.safeParse(input)
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

  it('字符串 trim、空备注省略、数字字段归一为 number', () => {
    const result = parse({
      lengthName: ' 12米 ',
      premium: 30,
      sortOrder: 2,
      status: ' 正常 ',
      remark: '   ',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      lengthName: '12米',
      premium: 30,
      sortOrder: 2,
      status: '正常',
    })
    expect(result.data && 'remark' in result.data).toBe(false)
  })

  it('空值（含缺失字段）报中文提示', () => {
    expect(issuesOf(validInput({ lengthName: '' }))).toContainEqual({
      path: 'lengthName',
      message: '定尺名称不能为空',
    })
    expect(issuesOf(validInput({ lengthName: '  ' }))).toContainEqual({
      path: 'lengthName',
      message: '定尺名称不能为空',
    })
    // antd InputNumber 清空后是 null：必须与「缺失」同样被拦下。
    expect(issuesOf(validInput({ premium: null }))).toContainEqual({
      path: 'premium',
      message: '加价不能为空',
    })
    expect(issuesOf(validInput({ premium: undefined }))).toContainEqual({
      path: 'premium',
      message: '加价不能为空',
    })
    expect(issuesOf(validInput({ sortOrder: null }))).toContainEqual({
      path: 'sortOrder',
      message: '排序号不能为空',
    })
    expect(issuesOf(validInput({ status: '' }))).toContainEqual({
      path: 'status',
      message: '状态只能是「正常」或「禁用」',
    })
  })

  /**
   * 负加价是**合法业务值**（表示优惠），后端只做区间限制而不做非负校验。
   * 这条用例防止把加价误改成「必须 ≥ 0」。
   */
  it('负加价合法（优惠），区间为 -100000..100000', () => {
    expect(parse(validInput({ premium: -1 })).success).toBe(true)
    expect(parse(validInput({ premium: -30 })).data?.premium).toBe(-30)
    expect(parse(validInput({ premium: 0 })).success).toBe(true)
    expect(parse(validInput({ premium: LENGTH_PREMIUM_MIN })).success).toBe(
      true,
    )
    expect(parse(validInput({ premium: LENGTH_PREMIUM_MAX })).success).toBe(
      true,
    )

    expect(
      issuesOf(validInput({ premium: LENGTH_PREMIUM_MIN - 1 })),
    ).toContainEqual({
      path: 'premium',
      message: `加价不能小于 ${LENGTH_PREMIUM_MIN}`,
    })
    expect(
      issuesOf(validInput({ premium: LENGTH_PREMIUM_MAX + 1 })),
    ).toContainEqual({
      path: 'premium',
      message: `加价不能大于 ${LENGTH_PREMIUM_MAX}`,
    })
  })

  it('加价必须是整数，排序号必须是非负整数', () => {
    expect(issuesOf(validInput({ premium: 30.5 }))).toContainEqual({
      path: 'premium',
      message: '加价必须为整数',
    })
    expect(parse(validInput({ sortOrder: 0 })).success).toBe(true)
    expect(issuesOf(validInput({ sortOrder: -1 }))).toContainEqual({
      path: 'sortOrder',
      message: '排序号不能为负数',
    })
    expect(issuesOf(validInput({ sortOrder: 1.5 }))).toContainEqual({
      path: 'sortOrder',
      message: '排序号必须为整数',
    })
  })

  it('状态白名单拒绝「停用」等非法值', () => {
    expect(parse(validInput({ status: '禁用' })).success).toBe(true)
    expect(issuesOf(validInput({ status: '停用' }))).toContainEqual({
      path: 'status',
      message: '状态只能是「正常」或「禁用」',
    })
  })

  it('超长按 32/255 边界判定', () => {
    const exactlyName = 'a'.repeat(LENGTH_PREMIUM_MAX_NAME_LENGTH)
    const overName = 'a'.repeat(LENGTH_PREMIUM_MAX_NAME_LENGTH + 1)
    const exactlyRemark = 'b'.repeat(LENGTH_PREMIUM_MAX_REMARK_LENGTH)
    const overRemark = 'b'.repeat(LENGTH_PREMIUM_MAX_REMARK_LENGTH + 1)

    expect(
      parse(validInput({ lengthName: exactlyName, remark: exactlyRemark }))
        .success,
    ).toBe(true)
    expect(issuesOf(validInput({ lengthName: overName }))).toContainEqual({
      path: 'lengthName',
      message: '定尺名称不能超过32个字符',
    })
    expect(issuesOf(validInput({ remark: overRemark }))).toContainEqual({
      path: 'remark',
      message: '备注不能超过255个字符',
    })
  })
})

describe('分页/详情响应契约（分页字段名与雪花 ID 精度）', () => {
  it('19 位 id 保持十进制字符串，不做 Number 转换', () => {
    const result = lengthPremiumPageSchema.safeParse(
      rawPage([
        rawRecord({ premium: -20 }),
        rawRecord({ id: '9007199254740993' }),
      ]),
    )
    expect(result.success).toBe(true)
    expect(result.data?.content.map((row) => row.id)).toEqual([
      SNOWFLAKE_ID,
      '9007199254740993',
    ])
    expect(typeof result.data?.content[0].id).toBe('string')
    // 负数加价必须原样穿过契约，不能被非负 schema 拦掉。
    expect(result.data?.content[0].premium).toBe(-20)
  })

  it('数值形态的 id 必须被契约拒绝', () => {
    const result = lengthPremiumPageSchema.safeParse(
      rawPage([rawRecord({ id: 12345 })]),
    )
    expect(result.success).toBe(false)
  })

  it('分页字段名必须是 currentPage/pageSize，且不接受 page/size', () => {
    const valid = lengthPremiumPageSchema.safeParse(rawPage([rawRecord()]))
    expect(valid.success).toBe(true)
    expect(valid.data?.currentPage).toBe(0)
    expect(valid.data?.pageSize).toBe(30)
    expect(valid.data?.hasMore).toBe(false)

    const wrongNames = lengthPremiumPageSchema.safeParse({
      content: [rawRecord()],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 30,
      hasMore: false,
    })
    expect(wrongNames.success).toBe(false)
  })

  it('totalElements 兼容后端十进制字符串并归一为数字', () => {
    const result = lengthPremiumPageSchema.safeParse({
      ...rawPage([rawRecord()]),
      totalElements: '42',
      totalPages: '2',
    })
    expect(result.success).toBe(true)
    expect(result.data?.totalElements).toBe(42)
    expect(result.data?.totalPages).toBe(2)
  })
})

describe('定尺加价请求函数', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiPutMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('列表默认按 sortOrder 升序，并透传状态与关键字', async () => {
    apiGetMock.mockResolvedValueOnce(rawPage([rawRecord({ premium: -20 })]))
    const page = await listLengthPremiums({
      status: '禁用',
      keyword: ' 12米 ',
      page: 1,
      size: 30,
    })

    expect(apiGetMock.mock.calls[0][0]).toBe('/length-premiums')
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      page: 1,
      size: 30,
      sortBy: 'sortOrder',
      direction: 'asc',
      status: '禁用',
      keyword: '12米',
    })
    expect(page.content[0].premium).toBe(-20)
    expect(page.totalElements).toBe(1)
    expect(page.currentPage).toBe(0)
    expect(page.pageSize).toBe(30)
    expect(page.hasMore).toBe(false)
  })

  it('列表未筛选时不下发空状态/空关键字', async () => {
    apiGetMock.mockResolvedValueOnce(rawPage([]))
    await listLengthPremiums({ keyword: '   ', page: 0, size: 30 })

    expect(apiGetMock.mock.calls[0][2].params).toMatchObject({
      status: undefined,
      keyword: undefined,
      sortBy: 'sortOrder',
      direction: 'asc',
    })
  })

  it('带 AbortSignal 的详情请求走路径 ID', async () => {
    const controller = new AbortController()
    apiGetMock.mockResolvedValueOnce(rawRecord({ remark: '原 yml 配置' }))
    const record = await getLengthPremium(SNOWFLAKE_ID, controller.signal)

    expect(apiGetMock.mock.calls[0][0]).toBe(`/length-premiums/${SNOWFLAKE_ID}`)
    expect(apiGetMock.mock.calls[0][2].signal).toBe(controller.signal)
    expect(record.id).toBe(SNOWFLAKE_ID)
    expect(record.lengthName).toBe('12米')
    expect(record.premium).toBe(30)
  })

  it('新增下发归一化后的载荷并携带幂等键（否则后端 422）', async () => {
    apiPostMock.mockResolvedValueOnce(rawRecord({ premium: -30 }))
    await createLengthPremium({
      lengthName: ' 12米 ',
      premium: -30,
      sortOrder: 1,
      status: '正常',
      remark: ' ',
    })

    expect(apiPostMock.mock.calls[0][0]).toBe('/length-premiums')
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      lengthName: '12米',
      premium: -30,
      sortOrder: 1,
      status: '正常',
    })
    expect(
      apiPostMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('更新走路径 ID 并携带幂等键', async () => {
    apiPutMock.mockResolvedValueOnce(rawRecord())
    await updateLengthPremium(SNOWFLAKE_ID, {
      lengthName: '12米',
      premium: 35,
      sortOrder: 2,
      status: '禁用',
    })

    expect(apiPutMock.mock.calls[0][0]).toBe(`/length-premiums/${SNOWFLAKE_ID}`)
    expect(apiPutMock.mock.calls[0][2]).toMatchObject({
      premium: 35,
      sortOrder: 2,
      status: '禁用',
    })
    expect(
      apiPutMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('删除走 204 无响应体接口并携带幂等键', async () => {
    apiDeleteMock.mockResolvedValueOnce(undefined)
    await deleteLengthPremium(SNOWFLAKE_ID)

    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      `/length-premiums/${SNOWFLAKE_ID}`,
    )
    expect(
      apiDeleteMock.mock.calls[0][1].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('非法载荷在发请求前就被拦下（超区间加价不落到网络层）', async () => {
    await expect(
      createLengthPremium({
        lengthName: '12米',
        premium: LENGTH_PREMIUM_MAX + 1,
        sortOrder: 1,
        status: '正常',
      }),
    ).rejects.toThrow()
    await expect(
      createLengthPremium({
        lengthName: '12米',
        premium: 30,
        sortOrder: 1,
        status: '停用',
      }),
    ).rejects.toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})
