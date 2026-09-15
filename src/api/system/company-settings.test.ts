import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }))

vi.mock('@/api/core/client', () => ({
  apiGet: apiGetMock,
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDeleteNoContent: vi.fn(),
}))

import { listCompanySettings } from './company-settings'

const companyRow = (id: string, companyName: string) => ({
  id,
  companyName,
  taxNo: '',
  status: '正常',
})

function companyPage(
  content: ReturnType<typeof companyRow>[],
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

describe('listCompanySettings', () => {
  beforeEach(() => {
    apiGetMock.mockReset()
  })

  it('按总页数拉全结算主体，避免首页截断后设置页与结算账户缺少公司', async () => {
    apiGetMock
      .mockResolvedValueOnce(companyPage([companyRow('1', '甲公司')], 2, 0))
      .mockResolvedValueOnce(companyPage([companyRow('2', '乙公司')], 2, 1))

    const companies = await listCompanySettings()

    expect(companies.map((company) => company.id)).toEqual(['1', '2'])
    expect(apiGetMock).toHaveBeenCalledTimes(2)
    expect(apiGetMock.mock.calls[1][2].params).toMatchObject({
      page: 1,
      size: 200,
      sortBy: 'id',
      direction: 'asc',
    })
  })

  it('单页响应只请求一次', async () => {
    apiGetMock.mockResolvedValueOnce(
      companyPage([companyRow('1', '甲公司')], 1, 0),
    )

    const companies = await listCompanySettings()

    expect(companies).toHaveLength(1)
    expect(apiGetMock).toHaveBeenCalledTimes(1)
  })
})
