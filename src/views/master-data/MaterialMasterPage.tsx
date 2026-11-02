import type { ReactNode } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'
import { LengthPremiumPage } from './LengthPremiumPage'
import {
  type MasterHostTabSpec,
  MasterHostTabs,
  useMasterHostTabsState,
} from './master-host-tabs'
import { ValueAliasPage } from './ValueAliasPage'

/**
 * 商品资料宿主页。
 *
 * <p>「基础数据」原有 11 个一层子项，用户确认合并为 6 个：本页吸收
 * 材料类别 / 定尺加价 / 值映射三个页面，菜单只保留「商品资料」一项。</p>
 *
 * <p>被并页的旧深链（/material-categories、/length-premium、/value-alias）已于
 * 2026-11-02 下线，进入对应标签的唯一方式是 `/material?tab=<key>`；本页按 `?tab=`
 * 选中标签，未带 `?tab=` 时回落到首个可见标签（商品资料）。</p>
 *
 * <p>标签内容的取舍：材料类别在 5e695529 之后已由通用列表页渲染
 * （旧专用页 `MaterialCategoriesPage` 已删除），所以这里继续渲染通用列表页，
 * 只把 pageDef 换成 material-categories，保证合并前后列表的列、工具栏与编辑能力不变。</p>
 */
const MATERIAL_HOST_TABS: readonly MasterHostTabSpec[] = [
  { key: 'material', pageKey: 'material' },
  { key: 'material-categories', pageKey: 'material-categories' },
  { key: 'length-premium', pageKey: 'length-premium' },
  { key: 'value-alias', pageKey: 'value-alias' },
]

export function MaterialMasterPage() {
  const { tabs, activeKey, switchTab } =
    useMasterHostTabsState(MATERIAL_HOST_TABS)

  return (
    <MasterHostTabs
      tabs={tabs}
      activeKey={activeKey}
      onChange={switchTab}
      renderTab={(tab) => renderMaterialTab(tab.key, tab.pageDef)}
    />
  )
}

/**
 * 标签内容。
 *
 * <p>通用列表页必须**显式传 pageDef**：`BusinessGridView` 会按当前 pathname 自解析
 * 页面定义，在 /length-premium 这类被并页路径下会解析成别的页面（甚至没有 moduleKey → 空白），
 * 不能依赖它自解析。</p>
 */
function renderMaterialTab(key: string, pageDef: AppPageDefinition): ReactNode {
  switch (key) {
    case 'material':
    case 'material-categories':
      return <BusinessGridPage key={key} pageDef={pageDef} />
    case 'length-premium':
      return <LengthPremiumPage />
    case 'value-alias':
      return <ValueAliasPage />
    default:
      // 标签清单是常量，未知 key 不会出现；渲染 null 而非抛错，避免脏 URL 打崩整页。
      return null
  }
}
