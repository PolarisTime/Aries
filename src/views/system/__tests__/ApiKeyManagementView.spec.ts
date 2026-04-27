import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import ApiKeyManagementView from '@/views/system/ApiKeyManagementView.vue'

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

function getNormalizedText(value: string) {
  return value.replace(/\s+/g, '')
}

function getButtonTexts(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('button').map((button) => getNormalizedText(button.text()))
}

function getLinkTexts(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('a').map((link) => getNormalizedText(link.text()))
}

function getUserFilterSelects(wrapper: ReturnType<typeof mount>) {
  return wrapper
    .findAllComponents({ name: 'ASelect' })
    .filter((component) => component.props('placeholder') === '筛选所属用户')
}

function mountWithPermissions(actions: string[], options?: { totpEnabled?: boolean }) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()
  authStore.user = {
    id: 1,
    loginName: 'admin',
    userName: 'Admin',
    totpEnabled: options?.totpEnabled,
  }
  permissionStore.setPermissions([{ resource: 'api-key', actions }])

  return mount(ApiKeyManagementView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
}

describe('ApiKeyManagementView', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPost.mockReset()
    clientMocks.httpGet.mockImplementation(async (url: string) => {
      if (url === '/auth/api-keys') {
        return {
          code: 0,
          data: {
            records: [{
              id: 1,
              userId: 1,
              loginName: 'leo',
              userName: 'Leo',
              keyName: '订单同步',
              usageScope: '全部接口',
              allowedResources: ['sales-order'],
              allowedActions: ['read', 'create', 'update'],
              keyPrefix: 'sk_live_123',
              rawKey: null,
              createdAt: '2026-04-25 10:00:00',
              expiresAt: null,
              lastUsedAt: null,
              status: '有效',
            }],
            totalElements: 1,
          },
        }
      }

      if (url === '/auth/api-keys/user-options') {
        return {
          code: 0,
          data: [{
            id: 1,
            loginName: 'leo',
            userName: 'Leo',
            mobile: '13800000000',
          }],
        }
      }

      if (url === '/auth/api-keys/resource-options') {
        return {
          code: 0,
          data: [{
            code: 'sales-order',
            title: '销售订单',
            group: '销售',
          }],
        }
      }

      if (url === '/auth/api-keys/action-options') {
        return {
          code: 0,
          data: [
            { code: 'read', title: '查看' },
            { code: 'create', title: '新增' },
            { code: 'update', title: '编辑' },
          ],
        }
      }

      if (url === '/auth/api-keys/1') {
        return {
          code: 0,
          data: {
            id: 1,
            userId: 1,
            loginName: 'leo',
            userName: 'Leo',
            keyName: '订单同步',
            usageScope: '全部接口',
            allowedResources: ['sales-order'],
            allowedActions: ['read', 'create', 'update'],
            keyPrefix: 'sk_live_123',
            rawKey: null,
            createdAt: '2026-04-25 10:00:00',
            expiresAt: null,
            lastUsedAt: null,
            status: '有效',
          },
        }
      }

      return { code: 0, data: [] }
    })
  })

  it('hides create and revoke actions without matching permissions', async () => {
    const wrapper = mountWithPermissions(['read'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)
    const linkTexts = getLinkTexts(wrapper)
    const userFilterSelects = getUserFilterSelects(wrapper)

    expect(buttonTexts).not.toContain('生成APIKey')
    expect(linkTexts).not.toContain('禁用')
    expect(linkTexts).toContain('查看')
    expect(userFilterSelects).toHaveLength(1)
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/auth/api-keys/user-options', {
      params: {
        keyword: undefined,
      },
    })
  })

  it('only renders the create action when create permission exists', async () => {
    const wrapper = mountWithPermissions(['read', 'create'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)
    const linkTexts = getLinkTexts(wrapper)

    expect(buttonTexts).toContain('生成APIKey')
    expect(linkTexts).not.toContain('禁用')
  })

  it('disables create action when current user has not enabled totp', async () => {
    const wrapper = mountWithPermissions(['read', 'create'], { totpEnabled: false })
    await flushPromises()

    expect(getNormalizedText(wrapper.text())).toContain('当前账号未启用2FA，禁止生成APIKey。请先在用户管理中完成2FA绑定。')
    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '生成APIKey')
    expect(createButton?.attributes('disabled')).toBeDefined()
  })

  it('renders revoke actions when edit permission exists', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)
    const linkTexts = getLinkTexts(wrapper)

    expect(buttonTexts).not.toContain('生成APIKey')
    expect(linkTexts).toContain('禁用')
  })

  it('does not issue duplicate list requests when searching from a later page', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    clientMocks.httpGet.mockClear()

    const table = wrapper.findComponent({ name: 'ATable' })
    const pagination = table.props('pagination') as { onChange: (page: number, size: number) => void }
    pagination.onChange(2, 20)
    await flushPromises()

    clientMocks.httpGet.mockClear()

    const inputSearch = wrapper.findComponent({ name: 'AInputSearch' })
    inputSearch.vm.$emit('search', '订单同步')
    await flushPromises()

    const listRequests = clientMocks.httpGet.mock.calls.filter(([url]) => url === '/auth/api-keys')
    expect(listRequests).toHaveLength(1)
    expect(listRequests[0]?.[1]).toMatchObject({
      params: expect.objectContaining({
        page: 0,
        size: 20,
      }),
    })
  })

  it('preloads user options only when the current user can manage api keys', async () => {
    const wrapper = mountWithPermissions(['read', 'update'])
    await flushPromises()

    const userFilterSelects = getUserFilterSelects(wrapper)

    expect(userFilterSelects).toHaveLength(1)
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/auth/api-keys/user-options', {
      params: {
        keyword: undefined,
      },
    })
  })
})
