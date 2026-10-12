import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({ apiGet: apiGetMock }))

import {
  fetchProjectAbbreviationOptions,
  fetchProjectOptions,
  fetchProjectQuoteConfig,
  normalizePriceClosedDayPrevSettle,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
  normalizeScopeEnforcement,
  toProjectAbbreviationOptions,
} from './project-options'

function projectPage(
  content: Array<{ id: string; projectName: string; projectNameAbbr?: string }>,
  totalPages: number,
  currentPage: number,
) {
  return {
    content,
    totalElements: totalPages * 200,
    totalPages,
    currentPage,
    pageSize: 200,
    hasMore: currentPage < totalPages - 1,
  }
}

describe('fetchProjectAbbreviationOptions', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('按总页数拉全启用项目，避免只取首页截断后选不到', async () => {
    apiGetMock
      .mockResolvedValueOnce(
        projectPage(
          [{ id: '1', projectName: '甲项目', projectNameAbbr: '甲' }],
          2,
          0,
        ),
      )
      .mockResolvedValueOnce(
        projectPage([{ id: '2', projectName: '乙项目' }], 2, 1),
      )

    const options = await fetchProjectAbbreviationOptions()

    expect(options.map((option) => option.value)).toEqual(['1', '2'])
    expect(apiGetMock).toHaveBeenCalledTimes(2)
    expect(apiGetMock.mock.calls[1][2].params).toMatchObject({
      page: 1,
      size: 200,
      status: '正常',
    })
  })

  it('单页响应只请求一次', async () => {
    apiGetMock.mockResolvedValueOnce(
      projectPage([{ id: '1', projectName: '甲项目' }], 1, 0),
    )

    await fetchProjectAbbreviationOptions()

    expect(apiGetMock).toHaveBeenCalledTimes(1)
  })
})

describe('toProjectAbbreviationOptions', () => {
  it('优先以项目简称作为提货分组下拉展示文本', () => {
    expect(
      toProjectAbbreviationOptions([
        {
          id: '333662242446770176',
          projectName: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
          projectNameAbbr: '欧帝半导体',
        },
      ]),
    ).toEqual([
      {
        value: '333662242446770176',
        label: '欧帝半导体',
        title: '苏州欧帝半导体科技有限公司半导体专用设备研发及生产项目',
      },
    ])
  })

  it('项目未维护简称时回退为项目全称', () => {
    expect(
      toProjectAbbreviationOptions([
        {
          id: '333662242446770177',
          projectName: '华东材料配送项目',
          projectNameAbbr: '',
        },
      ]),
    ).toEqual([
      {
        value: '333662242446770177',
        label: '华东材料配送项目',
        title: '华东材料配送项目',
      },
    ])
  })
})

describe('fetchProjectOptions 取价数据源', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('归一化 quoteSource/quoteRegion', async () => {
    apiGetMock.mockResolvedValue([
      {
        id: '1',
        value: '1',
        label: 'P1',
        customerId: '2',
        customerCode: 'C1',
        projectCode: 'P1',
        projectName: '项目一',
        quoteSource: 'STEELX',
        quoteRegion: '杭州',
      },
    ])
    const [option] = await fetchProjectOptions('2')
    expect(option.quoteSource).toBe('STEELX')
    expect(option.quoteRegion).toBe('杭州')
  })

  it('归一化 allowedBrands/allowedMaterials，去空白与重复', async () => {
    apiGetMock.mockResolvedValue([
      {
        id: '1',
        value: '1',
        label: 'P1',
        customerId: '2',
        customerCode: 'C1',
        projectCode: 'P1',
        projectName: '项目一',
        allowedBrands: [' 沙钢 ', '沙钢', '', '永钢'],
        allowedMaterials: ['HRB400E'],
      },
    ])
    const [option] = await fetchProjectOptions('2')
    expect(option.allowedBrands).toEqual(['沙钢', '永钢'])
    expect(option.allowedMaterials).toEqual(['HRB400E'])
  })

  it('未配置允许品牌/材质时归一化为空数组（表示不限制）', async () => {
    apiGetMock.mockResolvedValue([
      {
        id: '1',
        value: '1',
        label: 'P1',
        customerId: '2',
        customerCode: 'C1',
        projectCode: 'P1',
        projectName: '项目一',
        allowedBrands: null,
        allowedMaterials: '沙钢',
      },
    ])
    const [option] = await fetchProjectOptions('2')
    expect(option.allowedBrands).toEqual([])
    expect(option.allowedMaterials).toEqual([])
  })

  it('非法数据源被忽略', async () => {
    apiGetMock.mockResolvedValue([
      {
        id: '1',
        value: '1',
        label: 'P1',
        customerId: '2',
        customerCode: 'C1',
        projectCode: 'P1',
        projectName: '项目一',
        quoteSource: 'UNKNOWN',
      },
    ])
    const [option] = await fetchProjectOptions('2')
    expect(option.quoteSource).toBeUndefined()
  })
})

describe('fetchProjectQuoteConfig', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('返回项目取价数据源与地区', async () => {
    apiGetMock.mockResolvedValue({ quoteSource: 'STEELX', quoteRegion: '宁波' })
    const config = await fetchProjectQuoteConfig('9')
    expect(config).toEqual({ quoteSource: 'STEELX', quoteRegion: '宁波' })
    expect(apiGetMock.mock.calls[0][0]).toBe('/projects/9')
  })

  it('缺省返回空对象', async () => {
    apiGetMock.mockResolvedValue({})
    expect(await fetchProjectQuoteConfig('9')).toEqual({})
  })

  describe('项目采购范围力度', () => {
    beforeEach(() => {
      apiGetMock.mockReset()
    })

    function optionWith(overrides: Record<string, unknown>) {
      return {
        id: '1',
        value: '1',
        label: 'P1',
        customerId: '2',
        customerCode: 'C1',
        projectCode: 'P1',
        projectName: '项目一',
        ...overrides,
      }
    }

    it('归一化三个字面量并容忍大小写', async () => {
      apiGetMock.mockResolvedValue([
        optionWith({
          allowedBrands: ['沙钢'],
          allowedMaterials: ['HRB400'],
          allowedBrandSeverity: 'block',
          allowedMaterialSeverity: 'OFF',
        }),
      ])

      const [option] = await fetchProjectOptions('2')

      expect(option.allowedBrandSeverity).toBe('BLOCK')
      expect(option.allowedMaterialSeverity).toBe('OFF')
    })

    it('未下发或非法力度按提醒处理', async () => {
      apiGetMock.mockResolvedValue([
        optionWith({
          allowedBrands: ['沙钢'],
          allowedMaterials: ['HRB400'],
          allowedBrandSeverity: null,
          allowedMaterialSeverity: 'DISABLED',
        }),
      ])

      const [option] = await fetchProjectOptions('2')

      expect(option.allowedBrandSeverity).toBe('WARN')
      expect(option.allowedMaterialSeverity).toBe('WARN')
    })

    it('清单为空时不下发力度(不限制)', async () => {
      apiGetMock.mockResolvedValue([
        optionWith({
          allowedBrands: [],
          allowedMaterials: [],
          allowedBrandSeverity: 'BLOCK',
          allowedMaterialSeverity: 'BLOCK',
        }),
      ])

      const [option] = await fetchProjectOptions('2')

      expect(option.allowedBrandSeverity).toBeUndefined()
      expect(option.allowedMaterialSeverity).toBeUndefined()
    })

    it('normalizeScopeEnforcement 对未知值回落到默认档', () => {
      expect(normalizeScopeEnforcement(undefined)).toBe('WARN')
      expect(normalizeScopeEnforcement('  ')).toBe('WARN')
      expect(normalizeScopeEnforcement('unknown')).toBe('WARN')
      expect(normalizeScopeEnforcement('Warn')).toBe('WARN')
      expect(normalizeScopeEnforcement('BLOCK')).toBe('BLOCK')
    })
  })
})

describe('项目取价基准与时段归一化', () => {
  it('normalizePriceDateBasis 只认三个字面量并容忍大小写', () => {
    expect(normalizePriceDateBasis('order')).toBe('ORDER')
    expect(normalizePriceDateBasis(' MANUAL ')).toBe('MANUAL')
    expect(normalizePriceDateBasis('DELIVERY')).toBe('DELIVERY')
  })

  it('normalizePriceDateBasis 对未知值回落到送货日期', () => {
    expect(normalizePriceDateBasis(undefined)).toBe('DELIVERY')
    expect(normalizePriceDateBasis(null)).toBe('DELIVERY')
    expect(normalizePriceDateBasis('')).toBe('DELIVERY')
    expect(normalizePriceDateBasis('UNKNOWN')).toBe('DELIVERY')
  })

  it('normalizePriceDateOffsetDays 取整并夹到 0..30', () => {
    expect(normalizePriceDateOffsetDays(5)).toBe(5)
    expect(normalizePriceDateOffsetDays('7')).toBe(7)
    expect(normalizePriceDateOffsetDays(3.9)).toBe(3)
    expect(normalizePriceDateOffsetDays(-2)).toBe(0)
    expect(normalizePriceDateOffsetDays(31)).toBe(30)
    expect(normalizePriceDateOffsetDays(Number.MAX_SAFE_INTEGER)).toBe(30)
  })

  it('normalizePriceDateOffsetDays 对非法值回落到 0', () => {
    expect(normalizePriceDateOffsetDays(undefined)).toBe(0)
    expect(normalizePriceDateOffsetDays(null)).toBe(0)
    expect(normalizePriceDateOffsetDays('')).toBe(0)
    expect(normalizePriceDateOffsetDays('abc')).toBe(0)
    expect(normalizePriceDateOffsetDays(Number.NaN)).toBe(0)
    expect(normalizePriceDateOffsetDays(Number.POSITIVE_INFINITY)).toBe(0)
    // 布尔与对象不能被 Number() 隐式转成 1 或 0
    expect(normalizePriceDateOffsetDays(true)).toBe(0)
    expect(normalizePriceDateOffsetDays({})).toBe(0)
  })

  it('normalizePriceClosedDayPrevSettle 只认布尔真值', () => {
    expect(normalizePriceClosedDayPrevSettle(true)).toBe(true)
    expect(normalizePriceClosedDayPrevSettle(false)).toBe(false)
    expect(normalizePriceClosedDayPrevSettle(undefined)).toBe(false)
    expect(normalizePriceClosedDayPrevSettle(null)).toBe(false)
    // 字符串 'false' 是 truthy, 宽松判断会把休市口径读反
    expect(normalizePriceClosedDayPrevSettle('false')).toBe(false)
    expect(normalizePriceClosedDayPrevSettle('true')).toBe(false)
    expect(normalizePriceClosedDayPrevSettle(1)).toBe(false)
  })

  it('normalizePricePeriodPolicy 只认三个字面量, 未知值回落到自动', () => {
    expect(normalizePricePeriodPolicy('fixed')).toBe('FIXED')
    expect(normalizePricePeriodPolicy('Manual')).toBe('MANUAL')
    expect(normalizePricePeriodPolicy('AUTO')).toBe('AUTO')
    expect(normalizePricePeriodPolicy(undefined)).toBe('AUTO')
    expect(normalizePricePeriodPolicy('UNKNOWN')).toBe('AUTO')
  })

  it('normalizePricePeriodFixed 只认上午/中午/下午, 其余按未选择处理', () => {
    expect(normalizePricePeriodFixed('上午')).toBe('上午')
    expect(normalizePricePeriodFixed(' 下午 ')).toBe('下午')
    expect(normalizePricePeriodFixed('中午')).toBe('中午')
    expect(normalizePricePeriodFixed(null)).toBeNull()
    expect(normalizePricePeriodFixed(undefined)).toBeNull()
    expect(normalizePricePeriodFixed('')).toBeNull()
    expect(normalizePricePeriodFixed('夜间')).toBeNull()
  })
})
