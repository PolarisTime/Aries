import { useLocation } from '@tanstack/react-router'
import { Breadcrumb } from 'antd'
import type { MouseEvent } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveBreadcrumbItems } from '@/layouts/breadcrumb'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'

/**
 * 是否把这次点击接管为客户端路由。
 *
 * 仅接管「无修饰键的左键单击」：带 Ctrl/Command 的左键、中键与右键属于浏览器
 * 自身的「新标签页打开/新窗口打开/复制链接」语义，必须放行。
 */
function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

/**
 * 全局面包屑：展示当前页面在菜单层级中的位置（业务中心 / 分组 / 页面），
 * 与多标签页导航互补——标签表达「打开的平行文档」，面包屑表达「层级归属」。
 * 末项（当前页）不可点击。
 */
export function AppBreadcrumb() {
  const { t } = useTranslation()
  const location = useLocation()
  const openTab = useTabOpen()
  const items = useMemo(
    () => resolveBreadcrumbItems(location.pathname, t),
    [location.pathname, t],
  )

  /**
   * 面包屑跳转必须走多标签页统一入口（`useTabOpen`）。
   *
   * `<a href>` 的默认行为是浏览器整页导航：应用是 SPA，整页导航会丢弃全部运行时状态
   * ——重新下载入口 HTML 与全部 chunk、重新鉴权、所有页签重挂载，表现为「点一下面包屑
   * 整个应用重载一次」。这里保留 href（用于复制链接、右键新标签页打开、状态栏预览），
   * 只对普通左键点击 `preventDefault` 后交给客户端路由。
   */
  const handleNavigate = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, path: string) => {
      if (!isPlainLeftClick(event)) {
        return
      }
      event.preventDefault()
      openTab({ pathname: path })
    },
    [openTab],
  )

  return (
    <Breadcrumb
      aria-label={t('layouts.breadcrumb.ariaLabel')}
      className="leo-breadcrumb"
      items={items.map((item) => {
        const path = item.path
        return {
          title: path ? (
            <a href={path} onClick={(event) => handleNavigate(event, path)}>
              {item.title}
            </a>
          ) : (
            <span>{item.title}</span>
          ),
        }
      })}
    />
  )
}
