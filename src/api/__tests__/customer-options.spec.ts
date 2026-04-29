const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
  },
}))

describe('customer option helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    clientMocks.httpGet.mockReset()
  })

  it('deduplicates customer names and exposes projects from customer master data', async () => {
    clientMocks.httpGet.mockResolvedValue({
      code: 0,
      data: [
        {
          id: '1',
          label: '浙江大东吴杭萧绿建科技有限公司 / 苏州欧帝半导体项目',
          value: '浙江大东吴杭萧绿建科技有限公司',
          customerName: '浙江大东吴杭萧绿建科技有限公司',
          projectName: '苏州欧帝半导体项目',
          projectNameAbbr: '苏州欧帝',
        },
        {
          id: '2',
          label: '浙江大东吴杭萧绿建科技有限公司 / 恒力造船项目',
          value: '浙江大东吴杭萧绿建科技有限公司',
          customerName: '浙江大东吴杭萧绿建科技有限公司',
          projectName: '恒力造船项目',
          projectNameAbbr: '恒力',
        },
        {
          id: '3',
          label: '上海建工集团股份有限公司 / 浦东项目',
          value: '上海建工集团股份有限公司',
          customerName: '上海建工集团股份有限公司',
          projectName: '浦东项目',
        },
      ],
    })

    const {
      fetchCustomerOptions,
      findCustomerOption,
      getCustomerOptions,
      getCustomerProjectOptions,
      resolveSingleCustomerProjectName,
    } = await import('@/api/customer-options')

    await fetchCustomerOptions()

    expect(getCustomerOptions()).toEqual([
      { label: '浙江大东吴杭萧绿建科技有限公司', value: '浙江大东吴杭萧绿建科技有限公司' },
      { label: '上海建工集团股份有限公司', value: '上海建工集团股份有限公司' },
    ])
    expect(getCustomerProjectOptions({ customerName: '浙江大东吴杭萧绿建科技有限公司' }).map((option) => option.value))
      .toEqual(['苏州欧帝半导体项目', '恒力造船项目'])
    expect(resolveSingleCustomerProjectName('浙江大东吴杭萧绿建科技有限公司')).toBe('')
    expect(resolveSingleCustomerProjectName('上海建工集团股份有限公司')).toBe('浦东项目')
    expect(findCustomerOption('浙江大东吴杭萧绿建科技有限公司', '恒力造船项目')?.projectNameAbbr).toBe('恒力')
  })
})
