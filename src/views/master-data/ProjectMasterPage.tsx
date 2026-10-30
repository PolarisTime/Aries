import type { ReactNode } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'
import {
  type MasterHostTabSpec,
  MasterHostTabs,
  useMasterHostTabsState,
} from './master-host-tabs'
import { QuoteRegionPage } from './QuoteRegionPage'

/**
 * 项目资料宿主页。
 *
 * <p>吸收「基础数据」里的报价地区页面：菜单只保留「项目资料」，/quote-region 深链
 * 仍可用（页面定义 view 指向本宿主页，hiddenInMenu + activeMenuKey:'/project'），
 * 默认选中「报价地区」标签。</p>
 *
 * <p>项目资料标签渲染通用列表页；`ProjectPage`（master-archive 下的旧专用页）自
 * 接入通用列表页后已无加载器引用，因此不在这里复用，避免把两套实现同时搬上菜单。</p>
 */
const PROJECT_HOST_TABS: readonly MasterHostTabSpec[] = [
  { key: 'project', pageKey: 'project' },
  { key: 'quote-region', pageKey: 'quote-region' },
]

export function ProjectMasterPage() {
  const { tabs, activeKey, switchTab } =
    useMasterHostTabsState(PROJECT_HOST_TABS)

  return (
    <MasterHostTabs
      tabs={tabs}
      activeKey={activeKey}
      onChange={switchTab}
      renderTab={(tab) => renderProjectTab(tab.key, tab.pageDef)}
    />
  )
}

/** 通用列表页显式传 pageDef：/quote-region 路径下不能让它按 pathname 自解析。 */
function renderProjectTab(key: string, pageDef: AppPageDefinition): ReactNode {
  switch (key) {
    case 'project':
      return <BusinessGridPage key={key} pageDef={pageDef} />
    case 'quote-region':
      return <QuoteRegionPage />
    default:
      return null
  }
}
