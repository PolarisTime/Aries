import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({ apiGet: apiGetMock }))

import {
  fetchProjectAbbreviationOptions,
  fetchProjectOptions,
  fetchProjectPickerOptions,
  fetchProjectQuoteConfig,
  isPriceClosedSettleDaysValid,
  normalizePriceClosedSettleDays,
  normalizePriceClosedSettleDirection,
  normalizePriceDateBasis,
  normalizePriceDateOffsetDays,
  normalizePricePeriodFixed,
  normalizePricePeriodPolicy,
  normalizeScopeEnforcement,
  toProjectAbbreviationOptions,
} from './project-options'

function projectPage(
  content: Array<{
    id: string
    projectName: string
    projectNameAbbr?: string
    allowedBrands?: string[] | null
  }>,
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

  it('normalizePriceClosedSettleDirection 只认 PREV/NEXT, 其余回落到往前', () => {
    expect(normalizePriceClosedSettleDirection('PREV')).toBe('PREV')
    expect(normalizePriceClosedSettleDirection('next')).toBe('NEXT')
    expect(normalizePriceClosedSettleDirection(undefined)).toBe('PREV')
    expect(normalizePriceClosedSettleDirection(null)).toBe('PREV')
    expect(normalizePriceClosedSettleDirection('')).toBe('PREV')
    expect(normalizePriceClosedSettleDirection('BACKWARD')).toBe('PREV')
    expect(normalizePriceClosedSettleDirection(true)).toBe('PREV')
  })

  it('normalizePriceClosedSettleDays 保留显式 0, 缺省/非法回落到 1, 越界夹到 0..30', () => {
    // 0 是合法值(不位移), 旧布尔「关闭」迁移过来的历史项目正是 0, 编辑回填不能抬成 1
    expect(normalizePriceClosedSettleDays(0)).toBe(0)
    expect(normalizePriceClosedSettleDays('0')).toBe(0)
    expect(normalizePriceClosedSettleDays(3)).toBe(3)
    expect(normalizePriceClosedSettleDays('3')).toBe(3)
    expect(normalizePriceClosedSettleDays(2.7)).toBe(2)
    expect(normalizePriceClosedSettleDays(-5)).toBe(0)
    expect(normalizePriceClosedSettleDays(99)).toBe(30)
    // 缺省与非法值才回落到默认档 1
    expect(normalizePriceClosedSettleDays(undefined)).toBe(1)
    expect(normalizePriceClosedSettleDays(null)).toBe(1)
    expect(normalizePriceClosedSettleDays('')).toBe(1)
    expect(normalizePriceClosedSettleDays('abc')).toBe(1)
    expect(normalizePriceClosedSettleDays(Number.NaN)).toBe(1)
    expect(normalizePriceClosedSettleDays(true)).toBe(1)
    expect(normalizePriceClosedSettleDays({})).toBe(1)
  })

  it('isPriceClosedSettleDaysValid: 0 只在「报单日期 + 延后」下合法, MANUAL 不参与', () => {
    // 0 天 + 往前 / 送货日期 → 非法(必须 ≥1)
    expect(isPriceClosedSettleDaysValid(0, 'PREV', 'DELIVERY')).toBe(false)
    expect(isPriceClosedSettleDaysValid(0, 'PREV', 'ORDER')).toBe(false)
    expect(isPriceClosedSettleDaysValid(0, 'NEXT', 'DELIVERY')).toBe(false)
    // 0 天 + 报单日期 + 延后 → 合法(等价旧开关「关闭」)
    expect(isPriceClosedSettleDaysValid(0, 'NEXT', 'ORDER')).toBe(true)
    // ≥1 在任何参与基准下都合法
    expect(isPriceClosedSettleDaysValid(1, 'PREV', 'DELIVERY')).toBe(true)
    expect(isPriceClosedSettleDaysValid(30, 'PREV', 'ORDER')).toBe(true)
    // MANUAL 不参与: 任何天数都不阻断保存
    expect(isPriceClosedSettleDaysValid(0, 'PREV', 'MANUAL')).toBe(true)
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

describe('fetchProjectPickerOptions —— 比价页项目选择器取数', () => {
  /*
   * 项目是业务主数据，必须来自后端。
   * 历史缺陷：该清单曾打包为 `data/projects.json`，导致
   * ① 项目资料里新建的项目在比价页永远看不到（要改 JSON 重新发版）；
   * ② 同一实体在库与前端各存一份，JSON 里有两条记录的 id 其实是 projectCode，
   *    按错误 id 查取价配置直接 404。
   */
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('id 取后端 id, 名称取全称, 简称缺失时回退全称', async () => {
    apiGetMock.mockResolvedValueOnce(
      projectPage(
        [
          /**
           * 这条正是漂移事故的形态：`id` 与 `projectCode` 不同。
           * 取数必须以 `id` 为准 —— 用 projectCode 查 /projects/{id} 会 404。
           */
          {
            id: '349270654979153920',
            projectCode: '349270537135988736',
            projectName: '周王庙镇应急消防一体化中心项目',
            projectNameAbbr: '周王庙消防站',
          },
          { id: '2', projectName: '乙项目' },
        ] as never,
        1,
        0,
      ),
    )

    const rows = await fetchProjectPickerOptions()

    expect(rows).toEqual([
      {
        id: '349270654979153920',
        name: '周王庙镇应急消防一体化中心项目',
        abbr: '周王庙消防站',
        // 项目资料未配置允许品牌时为空数组，语义为「不限制」
        allowedBrands: [],
      },
      // 没有简称时 abbr 回退名称：选择器展示 `abbr || name`，不会出现空标签
      { id: '2', name: '乙项目', abbr: '乙项目', allowedBrands: [] },
    ])
  })

  /**
   * 比价页的「参与品牌」以项目资料的允许品牌为上限，因此选择器必须把这批品牌带到前端。
   * 空值/空白/null 一律归一化为空数组（语义＝项目不限制），避免下游把 `[' ']` 当成一个品牌。
   */
  it('把项目允许品牌归一化后透传给比价页', async () => {
    apiGetMock.mockResolvedValueOnce(
      projectPage(
        [
          {
            id: '1',
            projectName: '甲项目',
            allowedBrands: [' 中天 ', '中天', '万泰', ''],
          },
          { id: '2', projectName: '乙项目', allowedBrands: null },
        ],
        1,
        0,
      ),
    )

    const rows = await fetchProjectPickerOptions()

    expect(rows[0].allowedBrands).toEqual(['中天', '万泰'])
    expect(rows[1].allowedBrands).toEqual([])
  })

  it('按总页数拉全启用项目(新建项目在第 2 页也能选到)', async () => {
    apiGetMock
      .mockResolvedValueOnce(
        projectPage([{ id: '1', projectName: '甲项目' }], 2, 0),
      )
      .mockResolvedValueOnce(
        projectPage([{ id: '3', projectName: '新建的项目' }], 2, 1),
      )

    const rows = await fetchProjectPickerOptions()

    expect(rows.map((row) => row.id)).toEqual(['1', '3'])
    expect(apiGetMock).toHaveBeenCalledTimes(2)
  })
})
