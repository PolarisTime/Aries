import i18next from 'i18next'
import type { AppPageDefinition } from '@/config/page-registry-types'

export const systemPageDefinitions: AppPageDefinition[] = [
  {
    key: 'print-template',
    title: i18next.t('pages.print-template'),
    menuKey: '/print-template',
    view: 'print-template',
    icon: 'PrinterOutlined',
    menuParent: 'system',
    requiredPermission: 'print-templates:read',
  },
  {
    key: 'operation-log',
    title: i18next.t('pages.operation-log'),
    menuKey: '/operation-log',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'system',
    moduleKey: 'operation-log',
    requiredPermission: 'operation-logs:read',
  },
  {
    key: 'role-management',
    title: i18next.t('pages.role-management'),
    menuKey: '/role',
    view: 'role-management',
    icon: 'TeamOutlined',
    menuParent: 'system',
    requiredPermission: 'roles:read',
  },
  {
    key: 'user-accounts',
    title: i18next.t('pages.user-accounts'),
    menuKey: '/user-accounts',
    view: 'user-accounts',
    icon: 'UsergroupAddOutlined',
    menuParent: 'system',
    requiredPermission: 'user-accounts:read',
  },
  {
    // 个人账号已并入右上角「个人设置」，此处保留路由与视图以兼容旧链接，菜单隐藏。
    key: 'account',
    title: i18next.t('pages.account'),
    menuKey: '/account',
    view: 'account',
    icon: 'UserOutlined',
    menuParent: 'system',
    hiddenInMenu: true,
  },
]
