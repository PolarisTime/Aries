import { listBusinessModule } from '@/api/business/business-listing'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import type { AppPageDefinition } from '@/config/page-registry'
import { QUERY_KEYS } from '@/constants/query-keys'
import { buildDefaultModuleFilters } from '@/hooks/useModuleFilters'
import { queryClient } from '@/lib/query-client'
import { preloadView } from '@/router/view-loaders'
import { asString } from '@/utils/type-narrowing'

/**
 * 页面预热（chunk + 数据）的**唯一入口**。
 *
 * <p>标签面板里的页面是 `lazy(viewLoaders[view])`，并且列表页还要发一次列表请求；
 * 不预热时首次点开一个还没打开过的页面，用户会先看到整块页面骨架（实测 dev 下
 * 700ms+，`module-page-skeleton`），感知上就是「点了才加载」。</p>
 *
 * <p>两件事必须一起做，只做 chunk 不够：chunk 到位后页面组件仍要等数据，
 * 骨架并不会消失。因此这里同时把视图 chunk 与列表查询都提前发起。</p>
 *
 * <p><b>为什么不是靠 `defaultPreload: 'intent'`</b>：那个只对 router 的 `<Link>` 生效；
 * 本项目菜单是 antd Menu + `useTabOpen` 的 `history.push`，悬停不会触发任何路由预取。
 * 所以由菜单项/标签的悬停显式调用本函数。</p>
 */

/** 是否列表型视图（需要预热业务列表）：配置驱动的 business-grid 与主数据专属页 master-*。 */
export function isListPrefetchView(view: AppPageDefinition['view']): boolean {
  return view === 'business-grid' || view.startsWith('master-')
}

/**
 * 预取列表数据（失败静默：预取只是优化，页面自身的 `useQuery` 会重试）。
 *
 * <p>预取键必须与组件真实初始查询键一致（含默认过滤），否则预取无效。</p>
 */
export async function prefetchListData(
  definition: AppPageDefinition,
): Promise<void> {
  if (!isListPrefetchView(definition.view) || !definition.moduleKey) {
    return
  }
  const moduleKey = asString(definition.moduleKey)
  try {
    const runtimeConfig = await queryClient.ensureQueryData({
      queryKey: QUERY_KEYS.runtimeConfig,
      queryFn: getRuntimeConfig,
      staleTime: 30_000,
    })
    const pageSize = runtimeConfig.ui.defaultPageSize
    /*
     * 配置驱动的列表页都要先拿页面配置：预热键必须与组件真实初始查询键一致
     * （含 defaultFilters / 默认日期区间），否则预取无效。
     * 不能用 `view === 'business-grid'` 判定——材料/项目已改为宿主页视图（`master-*`），
     * 用 view 字面量判断会让它们的预取丢掉配置、退化成空筛选键。
     */
    const config = await loadBusinessPageConfig(moduleKey)
    await queryClient.ensureQueryData({
      queryKey: QUERY_KEYS.businessGridList(
        moduleKey,
        buildDefaultModuleFilters(config),
        1,
        pageSize,
      ),
      queryFn: ({ signal }) =>
        listBusinessModule(
          moduleKey,
          buildDefaultModuleFilters(config),
          { currentPage: 1, pageSize },
          { signal },
        ),
      staleTime: 60_000,
    })
  } catch {
    // 预取失败不影响页面渲染，组件内 useQuery 会自行重试
  }
}

/**
 * 预热一个页面：视图 chunk + （列表页）首屏数据。
 *
 * <p>调用方：菜单项悬停/聚焦、标签页悬停。**不要**在页面内重复实现预热逻辑 ——
 * 这里是唯一出口。</p>
 */
export function prefetchPage(definition: AppPageDefinition): void {
  preloadView(definition.view)
  void prefetchListData(definition)
}
