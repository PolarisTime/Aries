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
  createQuoteRegion,
  deleteQuoteRegion,
  getQuoteRegion,
  listQuoteRegions,
  parseQuoteRegionStatus,
  QUOTE_REGION_MAX_NAME_LENGTH,
  QUOTE_REGION_MAX_REMARK_LENGTH,
  QUOTE_REGION_MAX_SLUG_LENGTH,
  quoteRegionInputSchema,
  quoteRegionPageSchema,
  updateQuoteRegion,
} from './quote-regions'

/** 19 位雪花 ID：超出 Number.MAX_SAFE_INTEGER，只有按字符串处理才不会丢低位。 */
const SNOWFLAKE_ID = '1234567890123456789'

const rawRecord = (overrides: Record<string, unknown> = {}) => ({
  id: SNOWFLAKE_ID,
  regionName: '杭州',
  slug: 'hangzhou',
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
  regionName: '杭州',
  slug: 'hangzhou',
  sortOrder: 1,
  status: '正常',
  ...overrides,
})

describe('状态白名单解析（正常 / 禁用）', () => {
  it('忽略首尾空白，合法值原样返回', () => {
    expect(parseQuoteRegionStatus('正常')).toBe('正常')
    expect(parseQuoteRegionStatus(' 禁用 ')).toBe('禁用')
  })

  /**
   * 后端 `StatusConstants.DISABLED` 取自 `DocumentStatus.DISABLED.label()`，实际文案是
   * 「禁用」。V187 曾把 CHECK 约束写成「停用」，V188 已修正 —— 这条用例锁住该口径，
   * 避免下拉里再出现「停用」。
   */
  it('「停用」不是合法状态（后端与数据库 CHECK 都是「禁用」）', () => {
    expect(parseQuoteRegionStatus('停用')).toBeNull()
    expect(parseQuoteRegionStatus('DISABLED')).toBeNull()
  })

  it('非法/空值返回 null（读路径不整页失败）', () => {
    expect(parseQuoteRegionStatus('')).toBeNull()
    expect(parseQuoteRegionStatus('   ')).toBeNull()
    expect(parseQuoteRegionStatus(null)).toBeNull()
    expect(parseQuoteRegionStatus(undefined)).toBeNull()
    expect(parseQuoteRegionStatus(7)).toBeNull()
  })
})

describe('取价地区写入契约（Zod 边界）', () => {
  const parse = (input: unknown) => quoteRegionInputSchema.safeParse(input)
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
      regionName: '  杭州 ',
      slug: ' hangzhou  ',
      sortOrder: 1,
      status: ' 正常 ',
      remark: '   ',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 1,
      status: '正常',
    })
    expect(result.data && 'remark' in result.data).toBe(false)
  })

  it('空值（含缺失字段）报中文提示', () => {
    expect(issuesOf(validInput({ regionName: '' }))).toContainEqual({
      path: 'regionName',
      message: '城市名称不能为空',
    })
    expect(issuesOf(validInput({ regionName: '   ' }))).toContainEqual({
      path: 'regionName',
      message: '城市名称不能为空',
    })
    expect(issuesOf(validInput({ slug: '' }))).toContainEqual({
      path: 'slug',
      message: '子域名不能为空',
    })
    // antd InputNumber 清空后是 null：必须与「缺失」同样被拦下。
    expect(issuesOf(validInput({ sortOrder: null }))).toContainEqual({
      path: 'sortOrder',
      message: '排序号不能为空',
    })
    expect(issuesOf(validInput({ sortOrder: undefined }))).toContainEqual({
      path: 'sortOrder',
      message: '排序号不能为空',
    })
    expect(issuesOf(validInput({ status: '' }))).toContainEqual({
      path: 'status',
      message: '状态只能是「正常」或「禁用」',
    })
  })

  it('排序号必须是非负整数', () => {
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

  it('slug 只允许小写字母、数字与连字符', () => {
    expect(parse(validInput({ slug: 'zj-taizhou2' })).success).toBe(true)
    // 大小写折叠会静默改写抓取主机名，必须报错而不是替用户改。
    expect(issuesOf(validInput({ slug: 'Hangzhou' }))).toContainEqual({
      path: 'slug',
      message: '子域名只能包含小写字母、数字与连字符',
    })
    expect(issuesOf(validInput({ slug: 'hang_zhou' }))).toContainEqual({
      path: 'slug',
      message: '子域名只能包含小写字母、数字与连字符',
    })
    expect(issuesOf(validInput({ slug: '杭州' }))).toContainEqual({
      path: 'slug',
      message: '子域名只能包含小写字母、数字与连字符',
    })
  })

  it('状态白名单拒绝「停用」等非法值', () => {
    expect(parse(validInput({ status: '禁用' })).success).toBe(true)
    expect(issuesOf(validInput({ status: '停用' }))).toContainEqual({
      path: 'status',
      message: '状态只能是「正常」或「禁用」',
    })
  })

  it('超长按 32/64/255 边界判定', () => {
    const exactlyName = 'a'.repeat(QUOTE_REGION_MAX_NAME_LENGTH)
    const overName = 'a'.repeat(QUOTE_REGION_MAX_NAME_LENGTH + 1)
    const exactlySlug = 'a'.repeat(QUOTE_REGION_MAX_SLUG_LENGTH)
    const overSlug = 'a'.repeat(QUOTE_REGION_MAX_SLUG_LENGTH + 1)
    const exactlyRemark = 'b'.repeat(QUOTE_REGION_MAX_REMARK_LENGTH)
    const overRemark = 'b'.repeat(QUOTE_REGION_MAX_REMARK_LENGTH + 1)

    expect(
      parse(
        validInput({
          regionName: exactlyName,
          slug: exactlySlug,
          remark: exactlyRemark,
        }),
      ).success,
    ).toBe(true)
    expect(issuesOf(validInput({ regionName: overName }))).toContainEqual({
      path: 'regionName',
      message: '城市名称不能超过32个字符',
    })
    expect(issuesOf(validInput({ slug: overSlug }))).toContainEqual({
      path: 'slug',
      message: '子域名不能超过64个字符',
    })
    expect(issuesOf(validInput({ remark: overRemark }))).toContainEqual({
      path: 'remark',
      message: '备注不能超过255个字符',
    })
  })
})

describe('分页/详情响应契约（分页字段名与雪花 ID 精度）', () => {
  it('19 位 id 保持十进制字符串，不做 Number 转换', () => {
    const result = quoteRegionPageSchema.safeParse(
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
    const result = quoteRegionPageSchema.safeParse(
      rawPage([rawRecord({ id: 12345 })]),
    )
    expect(result.success).toBe(false)
  })

  /**
   * 后端 `PageResponse` 的分页游标字段名是 `currentPage`/`pageSize`，不是 `page`/`size`
   * （后者只是请求参数）。`exactPageSchema` 是 `z.strictObject`，写错字段名会直接判失败，
   * 这条用例把该约束固定下来。
   */
  it('分页字段名必须是 currentPage/pageSize，且不接受 page/size', () => {
    const valid = quoteRegionPageSchema.safeParse(rawPage([rawRecord()]))
    expect(valid.success).toBe(true)
    expect(valid.data?.currentPage).toBe(0)
    expect(valid.data?.pageSize).toBe(30)
    expect(valid.data?.hasMore).toBe(false)

    const wrongNames = quoteRegionPageSchema.safeParse({
      content: [rawRecord()],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 30,
      hasMore: false,
    })
    expect(wrongNames.success).toBe(false)
  })

  /**
   * 审计字段是**契约的一部分**：后端 `QuoteRegionResponse` 必须返回 `createdAt`。
   *
   * 历史事故：前端 schema 要求 createdAt 必填、页面也有「更新时间」列，但后端 DTO
   * 没暴露该字段 —— 每次打开页面都报「API 响应契约校验失败：GET /quote-regions」。
   * 当时这组单测因为 fixture 自己造了 createdAt 而全绿，掩盖了前后端不一致。
   *
   * 所以这里显式锁住两点：缺 createdAt 必须判失败；缺 updatedAt 允许（新记录未更新过）。
   */
  it('缺 createdAt 必须判契约失败（后端 DTO 必须暴露审计时间）', () => {
    const { createdAt: _omit, ...withoutCreatedAt } = rawRecord()
    const result = quoteRegionPageSchema.safeParse(rawPage([withoutCreatedAt]))
    expect(result.success).toBe(false)
  })

  it('updatedAt 允许为 null（记录从未更新过）', () => {
    const result = quoteRegionPageSchema.safeParse(
      rawPage([rawRecord({ updatedAt: null })]),
    )
    expect(result.success).toBe(true)
    expect(result.data?.content[0].updatedAt).toBeNull()
  })

  it('totalElements 兼容后端十进制字符串并归一为数字', () => {
    const result = quoteRegionPageSchema.safeParse({
      ...rawPage([rawRecord()]),
      totalElements: '42',
      totalPages: '2',
    })
    expect(result.success).toBe(true)
    expect(result.data?.totalElements).toBe(42)
    expect(result.data?.totalPages).toBe(2)
  })
})

describe('取价地区请求函数', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
    apiPostMock.mockReset()
    apiPutMock.mockReset()
    apiDeleteMock.mockReset()
  })

  it('列表默认按 sortOrder 升序，并透传状态与关键字', async () => {
    apiGetMock.mockResolvedValueOnce(rawPage([rawRecord()]))
    const page = await listQuoteRegions({
      status: '正常',
      keyword: ' 杭州 ',
      page: 1,
      size: 30,
    })

    expect(apiGetMock.mock.calls[0][0]).toBe('/quote-regions')
    expect(apiGetMock.mock.calls[0][2].params).toEqual({
      page: 1,
      size: 30,
      sortBy: 'sortOrder',
      direction: 'asc',
      status: '正常',
      keyword: '杭州',
    })
    expect(page.content[0].id).toBe(SNOWFLAKE_ID)
    expect(page.totalElements).toBe(1)
    expect(page.currentPage).toBe(0)
    expect(page.pageSize).toBe(30)
    expect(page.hasMore).toBe(false)
  })

  it('列表未筛选时不下发空状态/空关键字', async () => {
    apiGetMock.mockResolvedValueOnce(rawPage([]))
    await listQuoteRegions({ keyword: '   ', page: 0, size: 30 })

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
    const record = await getQuoteRegion(SNOWFLAKE_ID, controller.signal)

    expect(apiGetMock.mock.calls[0][0]).toBe(`/quote-regions/${SNOWFLAKE_ID}`)
    expect(apiGetMock.mock.calls[0][2].signal).toBe(controller.signal)
    expect(record.id).toBe(SNOWFLAKE_ID)
    expect(record.regionName).toBe('杭州')
    expect(record.sortOrder).toBe(1)
  })

  it('新增下发归一化后的载荷并携带幂等键（否则后端 422）', async () => {
    apiPostMock.mockResolvedValueOnce(rawRecord())
    await createQuoteRegion({
      regionName: ' 杭州 ',
      slug: ' hangzhou ',
      sortOrder: 1,
      status: '正常',
      remark: ' ',
    })

    expect(apiPostMock.mock.calls[0][0]).toBe('/quote-regions')
    expect(apiPostMock.mock.calls[0][2]).toEqual({
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 1,
      status: '正常',
    })
    expect(
      apiPostMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('更新走路径 ID 并携带幂等键', async () => {
    apiPutMock.mockResolvedValueOnce(rawRecord())
    await updateQuoteRegion(SNOWFLAKE_ID, {
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 2,
      status: '禁用',
    })

    expect(apiPutMock.mock.calls[0][0]).toBe(`/quote-regions/${SNOWFLAKE_ID}`)
    expect(apiPutMock.mock.calls[0][2]).toMatchObject({
      sortOrder: 2,
      status: '禁用',
    })
    expect(
      apiPutMock.mock.calls[0][3].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('删除走 204 无响应体接口并携带幂等键', async () => {
    apiDeleteMock.mockResolvedValueOnce(undefined)
    await deleteQuoteRegion(SNOWFLAKE_ID)

    expect(apiDeleteMock.mock.calls[0][0]).toBe(
      `/quote-regions/${SNOWFLAKE_ID}`,
    )
    expect(
      apiDeleteMock.mock.calls[0][1].headers['X-Idempotency-Key'],
    ).toBeTruthy()
  })

  it('非法载荷在发请求前就被拦下（非法 slug 不落到网络层）', async () => {
    await expect(
      createQuoteRegion({
        regionName: '杭州',
        slug: 'Hangzhou',
        sortOrder: 1,
        status: '正常',
      }),
    ).rejects.toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('非法排序号与非法状态同样在请求前被拦下', async () => {
    await expect(
      createQuoteRegion({
        regionName: '杭州',
        slug: 'hangzhou',
        sortOrder: -1,
        status: '正常',
      }),
    ).rejects.toThrow()
    await expect(
      createQuoteRegion({
        regionName: '杭州',
        slug: 'hangzhou',
        sortOrder: 0,
        status: '停用',
      }),
    ).rejects.toThrow()
    expect(apiPostMock).not.toHaveBeenCalled()
  })
})
