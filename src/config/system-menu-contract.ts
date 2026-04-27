import type { MenuNode } from '@/api/system-menus'
import { getPageDefinition } from '@/config/page-registry'

export interface SystemMenuContractIssue {
  type: 'missing-page' | 'route-mismatch'
  menuCode: string
  message: string
}

function normalizePath(path: string | null | undefined) {
  if (!path) {
    return ''
  }
  return path.startsWith('/') ? path : `/${path}`
}

export function validateSystemMenuTree(nodes: MenuNode[]) {
  const issues: SystemMenuContractIssue[] = []

  const visit = (menu: MenuNode) => {
    const matchedPage = getPageDefinition(menu.menuCode)
    const actualPath = normalizePath(menu.routePath)

    if (actualPath) {
      if (!matchedPage) {
        issues.push({
          type: 'missing-page',
          menuCode: menu.menuCode,
          message: `后端菜单 ${menu.menuCode}(${actualPath}) 缺少前端页面注册`,
        })
      } else {
        const expectedPath = normalizePath(matchedPage.menuKey)
        if (expectedPath && expectedPath !== actualPath) {
          issues.push({
            type: 'route-mismatch',
            menuCode: menu.menuCode,
            message: `后端菜单 ${menu.menuCode} 路由为 ${actualPath}，前端注册为 ${expectedPath}`,
          })
        }
      }
    }

    ;(menu.children || []).forEach((child) => visit(child))
  }

  nodes.forEach((menu) => visit(menu))
  return issues
}
