import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getQueryDataMock, httpGetMock } = vi.hoisted(() => ({
  getQueryDataMock: vi.fn(),
  httpGetMock: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: { get: httpGetMock },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: { getQueryData: getQueryDataMock },
}))

import {
  fetchProjectOptions,
  findProjectOption,
  getCustomerProjectOptions,
  normalizeProjectOptions,
} from './project-options'

describe('project-options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes project and customer identity as decimal strings', () => {
    expect(
      normalizeProjectOptions([
        {
          id: '308251467645452291',
          value: '308251467645452291',
          customerId: '308251467645452289',
          projectCode: 'P001',
          projectName: '同名项目',
          label: '',
        },
      ]),
    ).toEqual([
      {
        id: '308251467645452291',
        value: '308251467645452291',
        customerId: '308251467645452289',
        projectCode: 'P001',
        projectName: '同名项目',
        label: 'P001 / 同名项目',
      },
    ])
  })

  it('keeps projects with the same name but different ids separate', () => {
    const rows = normalizeProjectOptions([
      {
        id: '101',
        value: '101',
        customerId: '1',
        projectCode: 'P001',
        projectName: '同名项目',
        label: 'P001 / 同名项目',
      },
      {
        id: '102',
        value: '102',
        customerId: '1',
        projectCode: 'P002',
        projectName: '同名项目',
        label: 'P002 / 同名项目',
      },
    ])

    expect(rows.map((row) => row.value)).toEqual(['101', '102'])
  })

  it('requests projects with customerId and returns normalized rows', async () => {
    httpGetMock.mockResolvedValue({
      data: [
        {
          id: '101',
          value: '101',
          customerId: '1',
          projectCode: 'P001',
          projectName: '项目A',
          label: 'P001 / 项目A',
        },
      ],
    })

    await expect(fetchProjectOptions('1')).resolves.toEqual([
      expect.objectContaining({ id: '101', value: '101', customerId: '1' }),
    ])
    expect(httpGetMock).toHaveBeenCalledWith('/projects/options', {
      params: { customerId: '1' },
    })
  })

  it('reads only the cache belonging to the selected customer id', () => {
    getQueryDataMock.mockReturnValue([
      {
        id: '101',
        value: '101',
        customerId: '1',
        projectCode: 'P001',
        projectName: '项目A',
        label: 'P001 / 项目A',
      },
    ])

    expect(getCustomerProjectOptions({ customerId: '1' })).toHaveLength(1)
    expect(getQueryDataMock).toHaveBeenCalledWith([
      'master-options',
      'project',
      '1',
    ])
    expect(getCustomerProjectOptions({})).toEqual([])
  })

  it('uses a customer ledger counterparty id to select the project cache', () => {
    getQueryDataMock.mockReturnValue([
      {
        id: '101',
        value: '101',
        customerId: '1',
        projectCode: 'P001',
        projectName: '项目A',
        label: 'P001 / 项目A',
      },
    ])

    expect(
      getCustomerProjectOptions({
        counterpartyType: '客户',
        counterpartyId: '1',
      }),
    ).toHaveLength(1)
    expect(getQueryDataMock).toHaveBeenCalledWith([
      'master-options',
      'project',
      '1',
    ])
    expect(
      getCustomerProjectOptions({
        counterpartyType: '供应商',
        counterpartyId: '1',
      }),
    ).toEqual([])
  })

  it('finds a project by id and validates its customer ownership', () => {
    getQueryDataMock.mockReturnValue([
      {
        id: '101',
        value: '101',
        customerId: '1',
        projectCode: 'P001',
        projectName: '项目A',
        label: 'P001 / 项目A',
      },
    ])

    expect(findProjectOption('101', '1')?.projectName).toBe('项目A')
    expect(findProjectOption('101', '2')).toBeUndefined()
  })
})
