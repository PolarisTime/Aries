import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import SessionManagementView from '@/views/system/SessionManagementView.vue'

const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
    post: clientMocks.httpPost,
  },
  assertApiSuccess: <T extends { code?: number; message?: string }>(response: T) => {
    if (Number(response?.code) !== 0) {
      throw new Error(response?.message || '请求失败')
    }
    return response
  },
  isHandledRequestError: () => false,
})) 

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function mountWithPermissions(actions: string[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions([{ resource: 'session', actions }])

  return mount(SessionManagementView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
}

describe('SessionManagementView', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPost.mockReset()
    clientMocks.httpGet.mockImplementation((url: string) => {
      if (url === '/auth/refresh-tokens/summary') {
        return Promise.resolve({
          code: 0,
          data: {
            onlineUsers: 1,
            onlineSessions: 1,
            activeSessions: 1,
          },
        })
      }

      return Promise.resolve({
        code: 0,
        data: {
          records: [{
            id: 1,
            loginName: 'leo',
            userName: 'Leo',
            tokenId: 'token-1',
            loginIp: '127.0.0.1',
            deviceInfo: 'Chrome',
            createdAt: '2026-04-25 10:00:00',
            lastActiveAt: '2026-04-25 10:05:00',
            expiresAt: '2026-05-25 10:00:00',
            revokedAt: null,
            status: '有效',
            online: true,
          }],
          totalElements: 1,
        },
      })
    })
  })

  it('does not render revoke controls for users without edit permission', async () => {
    const wrapper = mountWithPermissions(['read'])
    await flushPromises()

    expect(wrapper.text()).not.toContain('清除全部')
    expect(wrapper.text()).not.toContain('禁用')
    expect(wrapper.text()).toContain('刷新')
    expect(wrapper.text()).toContain('在线人数')
    expect(wrapper.text()).toContain('在线')
  })

  it('renders revoke controls for users with edit permission', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    expect(wrapper.text()).toContain('清除全部')
    expect(wrapper.text()).toContain('禁用')
  })

  it('does not issue duplicate list requests when searching from a later page', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    clientMocks.httpGet.mockClear()

    const pagination = wrapper.findComponent({ name: 'APagination' })
    pagination.vm.$emit('change', 2, 20)
    await flushPromises()

    clientMocks.httpGet.mockClear()

    const inputSearch = wrapper.findComponent({ name: 'AInputSearch' })
    inputSearch.vm.$emit('search', 'token-1')
    await flushPromises()

    const listRequests = clientMocks.httpGet.mock.calls.filter(([url]) => url === '/auth/refresh-tokens')
    expect(listRequests).toHaveLength(1)
    expect(listRequests[0]?.[1]).toMatchObject({
      params: expect.objectContaining({
        page: 0,
        size: 20,
      }),
    })
  })
})
