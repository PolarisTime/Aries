import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'
import DatabaseBackupView from '@/views/system/DatabaseBackupView.vue'

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

function mountWithPermissions(actions: string[]) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const permissionStore = usePermissionStore()
  permissionStore.setPermissions([{ resource: 'database', actions }])

  return mount(DatabaseBackupView, {
    global: {
      plugins: [Antd, pinia],
    },
  })
}

describe('DatabaseBackupView', () => {
  beforeEach(() => {
    clientMocks.httpGet.mockReset()
    clientMocks.httpPost.mockReset()
    clientMocks.httpGet.mockImplementation((url: string) => {
      if (url === '/system/database/export-tasks') {
        return Promise.resolve({
          code: 0,
          data: [],
        })
      }

      return Promise.resolve({
        code: 0,
        data: {
          postgres: {
            host: '127.0.0.1',
            port: 5432,
            database: 'leo',
            version: '16',
            totalConnections: 10,
            activeConnections: 2,
            maxConnections: 100,
            databaseSize: '1 GB',
            tableCount: 30,
            serverStartTime: '2026-04-25T10:00:00',
            status: '正常',
          },
          redis: {
            host: '127.0.0.1',
            port: 6379,
            database: 0,
            version: '7',
            usedMemory: 1024,
            usedMemoryPeak: 2048,
            totalKeys: 12,
            connectedClients: 2,
            uptime: '1d',
            hitCount: 10,
            missCount: 1,
            hitRate: 90,
            status: '正常',
          },
        },
      })
    })
  })

  it('hides export and import actions without matching permissions', async () => {
    const wrapper = mountWithPermissions(['read'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)

    expect(buttonTexts).not.toContain('导出备份')
    expect(buttonTexts).not.toContain('导入备份')
    expect(getNormalizedText(wrapper.text())).toContain('数据库状态')
  })

  it('shows export and import actions when permissions are granted', async () => {
    const wrapper = mountWithPermissions(['read', 'export', 'update'])
    await flushPromises()

    const buttonTexts = getButtonTexts(wrapper)

    expect(buttonTexts).toContain('提交导出')
    expect(buttonTexts).toContain('导入备份')
    expect(getNormalizedText(wrapper.text())).toContain('导出任务')
  })
})
