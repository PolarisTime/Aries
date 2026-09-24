import { useLocation } from '@tanstack/react-router'
import { Breadcrumb } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveBreadcrumbItems } from '@/layouts/breadcrumb'

/**
 * 全局面包屑：展示当前页面在菜单层级中的位置（业务中心 / 分组 / 页面），
 * 与多标签页导航互补——标签表达「打开的平行文档」，面包屑表达「层级归属」。
 * 末项（当前页）不可点击。
 */
export function AppBreadcrumb() {
  const { t } = useTranslation()
  const location = useLocation()
  const items = useMemo(
    () => resolveBreadcrumbItems(location.pathname, t),
    [location.pathname, t],
  )

  return (
    <Breadcrumb
      aria-label={t('layouts.breadcrumb.ariaLabel')}
      className="leo-breadcrumb"
      items={items.map((item) => ({
        title: item.path ? (
          <a href={item.path}>{item.title}</a>
        ) : (
          <span>{item.title}</span>
        ),
      }))}
    />
  )
}
