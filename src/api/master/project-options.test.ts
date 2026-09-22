import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({ apiGet: apiGetMock }))

import {
  fetchProjectAbbreviationOptions,
  fetchProjectOptions,
  fetchProjectQuoteConfig,
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
})
