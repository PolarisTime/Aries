import type { AppPageDefinition } from '@/config/page-registry-types'

export const systemPageDefinitions: AppPageDefinition[] = [
  {
    key: 'print-template',
    title: '打印模板',
    menuKey: '/print-template',
    view: 'print-template',
    icon: 'PrinterOutlined',
    menuParent: 'system',
    requiredPermission: 'print-templates:read',
  },
  {
    key: 'operation-log',
    title: '操作日志',
    menuKey: '/operation-log',
    view: 'business-grid',
    icon: 'FileSearchOutlined',
    menuParent: 'system',
    moduleKey: 'operation-log',
    requiredPermission: 'operation-logs:read',
  },
  {
    key: 'role-management',
    title: '角色管理',
    menuKey: '/role',
    view: 'role-management',
    icon: 'TeamOutlined',
    menuParent: 'system',
    requiredPermission: 'roles:read',
  },
  {
    key: 'user-accounts',
    title: '用户账号',
    menuKey: '/user-accounts',
    view: 'user-accounts',
    icon: 'UsergroupAddOutlined',
    menuParent: 'system',
    requiredPermission: 'user-accounts:read',
  },
  {
    // 个人账号已并入右上角「个人设置」，此处保留路由与视图以兼容旧链接，菜单隐藏。
    key: 'account',
    title: '个人账号',
    menuKey: '/account',
    view: 'account',
    icon: 'UserOutlined',
    menuParent: 'system',
    hiddenInMenu: true,
  },
]
