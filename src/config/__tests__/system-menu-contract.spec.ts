import { describe, expect, it } from 'vitest'
import { validateSystemMenuTree } from '@/config/system-menu-contract'

describe('system menu contract validation', () => {
  it('accepts known frontend pages with matching route paths', () => {
    const issues = validateSystemMenuTree([
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        parentCode: null,
        routePath: '/dashboard',
        icon: 'HomeOutlined',
        sortOrder: 1,
        menuType: '菜单',
        actions: ['read'],
        children: [],
      },
      {
        menuCode: 'system',
        menuName: '系统设置',
        parentCode: null,
        routePath: null,
        icon: 'PrinterOutlined',
        sortOrder: 2,
        menuType: '目录',
        actions: [],
        children: [
          {
            menuCode: 'print-templates',
            menuName: '打印模板',
            parentCode: 'system',
            routePath: '/print-templates',
            icon: 'PrinterOutlined',
            sortOrder: 1,
            menuType: '菜单',
            actions: ['read'],
            children: [],
          },
        ],
      },
    ])

    expect(issues).toEqual([])
  })

  it('reports missing pages and route mismatches returned by backend menus', () => {
    const issues = validateSystemMenuTree([
      {
        menuCode: 'unknown-page',
        menuName: '未知页面',
        parentCode: null,
        routePath: '/unknown-page',
        icon: null,
        sortOrder: 1,
        menuType: '菜单',
        actions: ['read'],
        children: [],
      },
      {
        menuCode: 'database-management',
        menuName: '数据库管理',
        parentCode: null,
        routePath: '/ops-support',
        icon: null,
        sortOrder: 2,
        menuType: '菜单',
        actions: ['read'],
        children: [],
      },
    ])

    expect(issues).toHaveLength(2)
    expect(issues[0]?.type).toBe('missing-page')
    expect(issues[1]?.type).toBe('route-mismatch')
  })
})
