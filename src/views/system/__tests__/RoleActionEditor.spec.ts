import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { message } from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import RoleActionEditor from '@/views/system/RoleActionEditor.vue'

const clientMocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  httpPut: vi.fn(),
  httpPost: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  http: {
    get: clientMocks.httpGet,
    put: clientMocks.httpPut,
    post: clientMocks.httpPost,
  },
  assertApiSuccess: <T extends { code?: number; message?: string }>(
    response: T,
  ) => {
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

function getDocumentButtonByText(text: string) {
  return Array.from(document.body.querySelectorAll('button')).find(
    (button) => getNormalizedText(button.textContent || '') === text,
  )
}

function mountWithPermissions(permissionMap: Record<string, string[]>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions(
    Object.entries(permissionMap).map(([resource, actions]) => ({ resource, actions })),
  )

  const wrapper = mount(RoleActionEditor, {
    global: {
      plugins: [Antd, pinia],
    },
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

const viewOnlyPermissions = {
  role: ['read'],
}

const fullPermissions = {
  role: ['read', 'create', 'update', 'manage_permissions'],
}

const mountedWrappers: VueWrapper[] = []

describe('RoleActionEditor', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPut.mockReset()
    clientMocks.httpPost.mockReset()
    clientMocks.httpGet.mockImplementation(async (url: string) => {
      if (url === '/role-settings/permission-options') {
        return {
          code: 0,
          data: [
            {
              menuCode: 'permission-group-1',
              menuName: '系统',
              parentCode: null,
              routePath: null,
              icon: null,
              sortOrder: 1,
              menuType: 'CATALOG',
              actions: [],
              children: [
                {
                  menuCode: 'print-templates',
                  menuName: '打印模板',
                  parentCode: 'permission-group-1',
                  routePath: '/print-templates',
                  icon: null,
                  sortOrder: 1,
                  menuType: 'MENU',
                  actions: ['read', 'update'],
                  children: [],
                },
              ],
            },
          ],
        }
      }

      if (url === '/role-settings') {
        return {
          code: 0,
          data: {
            records: [
              {
                id: 1,
                roleCode: 'ADMIN',
                roleName: '管理员',
                roleType: '系统角色',
                dataScope: '全部',
                status: '正常',
                userCount: 1,
                remark: null,
              },
            ],
          },
        }
      }

      if (url === '/role-settings//permissions') {
        return {
          code: 0,
          data: [
            {
              resource: 'print-template',
              action: 'read',
            },
          ],
        }
      }

      return { code: 0, data: [] }
    })
  })

  afterEach(async () => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    await flushPromises()
  })

  it('hides role mutation controls without create/edit permission', async () => {
    const wrapper = mountWithPermissions(viewOnlyPermissions)
    await flushPromises()

    const pageText = getNormalizedText(wrapper.text())

    expect(pageText).not.toContain('新增')
    expect(pageText).not.toContain('保存权限')
    expect(pageText).not.toContain('编辑')
    expect(pageText).toContain('管理员')
  })

  it('shows role mutation controls when create/edit permission exists', async () => {
    const wrapper = mountWithPermissions(fullPermissions)
    await flushPromises()
    await wrapper.find('.role-item').trigger('click')
    await flushPromises()

    const pageText = getNormalizedText(wrapper.text())

    expect(pageText).toContain('新增')
    expect(pageText).toContain('保存权限')
    expect(pageText).toContain('编辑')
  })

  it('loads role permission options instead of current user menu tree', async () => {
    mountWithPermissions(fullPermissions)
    await flushPromises()

    expect(clientMocks.httpGet).toHaveBeenCalledWith('/role-settings/permission-options')
    expect(clientMocks.httpGet).not.toHaveBeenCalledWith('/system/menus/tree')
  })

  it('loads every role page instead of truncating after the first 100 records', async () => {
    clientMocks.httpGet.mockImplementation(
      async (
        url: string,
        config?: { params?: { page?: number; size?: number } },
      ) => {
        if (url === '/role-settings') {
          const page = Number(config?.params?.page || 0)
          if (page === 0) {
            return {
              code: 0,
              data: {
                records: Array.from({ length: 100 }, (_, index) => ({
                  id: index + 1,
                  roleCode: `ROLE_${index + 1}`,
                  roleName: `角色${index + 1}`,
                  roleType: '系统角色',
                  dataScope: '全部',
                  status: '正常',
                  userCount: 0,
                  remark: null,
                })),
                totalPages: 2,
              },
            }
          }

          return {
            code: 0,
            data: {
              records: [
                {
                  id: 101,
                  roleCode: 'ROLE_101',
                  roleName: '角色101',
                  roleType: '系统角色',
                  dataScope: '全部',
                  status: '正常',
                  userCount: 0,
                  remark: null,
                },
              ],
              totalPages: 2,
            },
          }
        }

        return { code: 0, data: [] }
      },
    )

    const wrapper = mountWithPermissions(viewOnlyPermissions)
    await flushPromises()
    await flushPromises()

    expect(clientMocks.httpGet).toHaveBeenCalledWith('/role-settings', {
      params: { page: 0, size: 100 },
    })
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/role-settings', {
      params: { page: 1, size: 100 },
    })
    expect(getNormalizedText(wrapper.text())).toContain('角色101')
  })

  it('keeps already loaded roles when a later page fails', async () => {
    clientMocks.httpGet.mockImplementation(
      async (
        url: string,
        config?: { params?: { page?: number; size?: number } },
      ) => {
        if (url === '/role-settings') {
          const page = Number(config?.params?.page || 0)
          if (page === 0) {
            return {
              code: 0,
              data: {
                records: Array.from({ length: 100 }, (_, index) => ({
                  id: index + 1,
                  roleCode: index === 0 ? 'ADMIN' : `ROLE_${index + 1}`,
                  roleName: index === 0 ? '管理员' : `角色${index + 1}`,
                  roleType: '系统角色',
                  dataScope: '全部',
                  status: '正常',
                  userCount: 1,
                  remark: null,
                })),
                totalPages: 2,
              },
            }
          }

          throw new Error('network error')
        }

        return { code: 0, data: [] }
      },
    )

    const errorSpy = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as never)

    const wrapper = mountWithPermissions(viewOnlyPermissions)
    await flushPromises()
    await flushPromises()

    expect(getNormalizedText(wrapper.text())).toContain('管理员')
    expect(clientMocks.httpGet).toHaveBeenCalledWith('/role-settings', {
      params: { page: 1, size: 100 },
    })
    expect(errorSpy).not.toHaveBeenCalledWith('加载角色失败')

    errorSpy.mockRestore()
  })

  it('clears the stale selection when the selected role disappears after a partial reload failure', async () => {
    let failSecondPage = false

    clientMocks.httpGet.mockImplementation(
      async (
        url: string,
        config?: { params?: { page?: number; size?: number } },
      ) => {
        if (url === '/role-settings') {
          const page = Number(config?.params?.page || 0)
          if (page === 0) {
            return {
              code: 0,
              data: {
                records: Array.from({ length: 100 }, (_, index) => ({
                  id: index + 1,
                  roleCode: `ROLE_${index + 1}`,
                  roleName: `角色${index + 1}`,
                  roleType: '系统角色',
                  dataScope: '全部',
                  status: '正常',
                  userCount: 0,
                  remark: null,
                })),
                totalPages: 2,
              },
            }
          }

          if (failSecondPage) {
            throw new Error('network error')
          }

          return {
            code: 0,
            data: {
              records: [
                {
                  id: 101,
                  roleCode: 'ROLE_101',
                  roleName: '角色101',
                  roleType: '系统角色',
                  dataScope: '全部',
                  status: '正常',
                  userCount: 0,
                  remark: null,
                },
              ],
              totalPages: 2,
            },
          }
        }

        if (url === '/role-settings//permissions') {
          return {
            code: 0,
            data: [],
          }
        }

        return { code: 0, data: [] }
      },
    )
    clientMocks.httpPut.mockResolvedValue({ code: 0, data: null })

    const errorSpy = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as never)

    const wrapper = mountWithPermissions(fullPermissions)
    await flushPromises()
    await flushPromises()

    const roleItems = wrapper.findAll('.role-item')
    await roleItems[100]!.trigger('click')
    await flushPromises()

    expect(getNormalizedText(wrapper.text())).toContain('角色101-权限配置')

    failSecondPage = true

    const editLinks = wrapper.findAll('.role-edit-link')
    await editLinks[100]!.trigger('click')
    await flushPromises()

    const saveButton = getDocumentButtonByText('保存')
    expect(saveButton).toBeDefined()
    saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    await flushPromises()

    const pageText = getNormalizedText(wrapper.text())
    expect(pageText).toContain('请从左侧选择一个角色来配置权限')
    expect(pageText).not.toContain('角色101-权限配置')
    expect(pageText).not.toContain('保存权限')
    expect(errorSpy).not.toHaveBeenCalledWith('加载角色失败')

    errorSpy.mockRestore()
  })

  it('does not request role catalog data without role read permission', async () => {
    const wrapper = mountWithPermissions({
      'print-template': ['read'],
    })
    await flushPromises()

    expect(clientMocks.httpGet).not.toHaveBeenCalledWith(
      '/role-settings',
      expect.anything(),
    )
    expect(getNormalizedText(wrapper.text())).toContain(
      '当前账号缺少角色列表查看权限',
    )
  })

  it('preserves disabled status when editing an existing role', async () => {
    clientMocks.httpGet.mockImplementation(async (url: string) => {
      if (url === '/role-settings') {
        return {
          code: 0,
          data: {
            records: [
              {
                id: '2',
                roleCode: 'DISABLED_ROLE',
                roleName: '已禁用角色',
                roleType: '系统角色',
                dataScope: '全部',
                status: '禁用',
                userCount: 0,
                remark: null,
              },
            ],
          },
        }
      }

      return { code: 0, data: [] }
    })
    clientMocks.httpPut.mockResolvedValue({ code: 0, data: null })

    const wrapper = mountWithPermissions(fullPermissions)
    await flushPromises()

    const editLink = wrapper.find('.role-edit-link')
    await editLink.trigger('click')
    await flushPromises()

    const saveButton = getDocumentButtonByText('保存')
    expect(saveButton).toBeDefined()
    saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(clientMocks.httpPut).toHaveBeenCalledWith(
      '/role-settings/2',
      expect.objectContaining({
        status: '禁用',
      }),
    )
  })
})
