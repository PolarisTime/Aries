import type { AppPageDefinition } from '@/config/page-registry-types'

export const systemPageDefinitions: AppPageDefinition[] = [
  {
    key: 'print-template',
    titleKey: 'pages.print-template',
    menuKey: '/print-template',
    view: 'print-template',
    icon: 'PrinterOutlined',
    menuParent: 'system',
    requiredPermission: 'print-templates:read',
  },
  {
    key: 'operation-log',
    titleKey: 'pages.operation-log',
    menuKey: '/operation-log',
    view: 'operation-log',
    icon: 'FileSearchOutlined',
    menuParent: 'system',
    moduleKey: 'operation-log',
    requiredPermission: 'operation-logs:read',
  },
  {
    key: 'role-management',
    titleKey: 'pages.role-management',
    menuKey: '/role',
    view: 'role-management',
    icon: 'TeamOutlined',
    menuParent: 'system',
    requiredPermission: 'roles:read',
  },
  {
    key: 'user-accounts',
    titleKey: 'pages.user-accounts',
    menuKey: '/user-accounts',
    view: 'user-accounts',
    icon: 'UsergroupAddOutlined',
    menuParent: 'system',
    requiredPermission: 'user-accounts:read',
  },
]
