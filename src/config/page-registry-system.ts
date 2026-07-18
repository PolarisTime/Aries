import type { AppPageDefinition } from '@/config/page-registry-types'

export const systemPageDefinitions: AppPageDefinition[] = [
  {
    key: 'print-template',
    title: '打印模板',
    menuKey: '/print-template',
    view: 'print-template',
    icon: 'PrinterOutlined',
    menuParent: 'system',
  },
  {
    key: 'operation-log',
    title: '操作日志',
    menuKey: '/operation-log',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'system',
    moduleKey: 'operation-log',
  },
  {
    key: 'user-account',
    title: '账号管理',
    menuKey: '/user-accounts',
    view: 'user-account',
    icon: 'UserOutlined',
    menuParent: 'system',
  },
]
