import {
  mockListMaterials,
  mockListPurchaseOrders,
  mockLogin,
  mockSearchSuppliers,
} from '@/mock/server'

describe('mock server', () => {
  it('returns a mock login payload', async () => {
    const response = await mockLogin({
      loginName: 'designer',
      password: '123456',
    })

    expect(response.code).toBe(200)
    expect(response.data.msgTip).toBe('user can login')
    expect(response.data.user?.username).toBe('前端设计账号')
  })

  it('filters materials with paging', async () => {
    const response = await mockListMaterials(
      {
        materialParam: '钢',
        enabled: '1',
      },
      {
        currentPage: 1,
        pageSize: 5,
      },
    )

    expect(response.code).toBe(200)
    expect(response.data?.rows?.length).toBeGreaterThan(0)
    expect(response.data?.total).toBeGreaterThan(0)
  })

  it('filters purchase orders by supplier and status', async () => {
    const response = await mockListPurchaseOrders(
      {
        type: '其它',
        subType: '采购订单',
        organId: 1,
        status: '1',
      },
      {
        currentPage: 1,
        pageSize: 10,
      },
    )

    expect(response.code).toBe(200)
    expect(response.data?.rows?.every((item) => item.organId === 1)).toBe(true)
    expect(response.data?.rows?.every((item) => String(item.status) === '1')).toBe(
      true,
    )
  })

  it('searches suppliers locally', async () => {
    const response = await mockSearchSuppliers('钢')

    expect(response.length).toBeGreaterThan(0)
    expect(response[0]?.supplier).toContain('钢')
  })
})
