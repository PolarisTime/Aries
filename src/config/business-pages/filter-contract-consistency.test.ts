import { describe, expect, it } from 'vitest'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import type { ModuleKey } from '@/module-system/core/module-key'

/**
 * 「页面筛选器」与「服务端参数白名单」的一致性守卫。
 *
 * <p><b>为什么需要这条测试</b>：列表页的一个筛选条件由**两份互不相识的清单**共同决定 ——</p>
 * <ol>
 *   <li>`business-pages/**` 里页面配置的 `filters`（决定筛选控件是否渲染）；</li>
 *   <li>`api/contracts/**` 的 `nativeFilterKeys`（决定该参数是否随请求发出）。</li>
 * </ol>
 *
 * <p>只在 (1) 里加筛选、忘了 (2)：筛选框显示正常，但请求不带参数 —— 用户以为筛选生效，
 * 实际结果集没变。反过来只在 (2) 里登记、忘了 (1)：控件不渲染，功能不可达。</p>
 *
 * <p>这个缺陷真实发生过：一次提交把筛选器加进了 `module-page-schema.ts` 的 `filters`，
 * 而那份配置**全仓库无人消费**（真实来源是 `business-pages/**`），于是白名单放行了、
 * 控件却从未渲染，`tsc` / `biome` / `eslint` 全绿 —— 因为两处赋值类型都合法。
 * 更麻烦的是：配置里能搜到 `productKeyword` 字样，评审时看起来「已实现」。</p>
 *
 * <p>所以本测试断言的是**跨清单的交叉一致性**，而不是任何单份清单的内容。
 * 加筛选条件时漏改任意一侧，这里都会红。</p>
 */
const MODULES = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'sales-return',
  'freight-bill',
] as const satisfies readonly ModuleKey[]

describe('页面筛选器 ↔ 服务端参数白名单', () => {
  /**
   * 反向守卫：确保上面列出的模块确实都有配置。
   * 没有这条，一旦模块 key 改名导致 `loadBusinessPageConfig` 返回 undefined，
   * 下面的断言会因为「没有筛选器」而空过（假绿）。
   */
  it('列出的每个模块都能加载到页面配置', async () => {
    for (const moduleKey of MODULES) {
      const config = await loadBusinessPageConfig(moduleKey)
      expect(config, `模块 ${moduleKey} 未加载到页面配置`).toBeDefined()
      expect(
        config?.filters?.length,
        `模块 ${moduleKey} 没有任何筛选器`,
      ).toBeGreaterThan(0)
    }
  })

  it('每个页面筛选器的 key 都必须出现在服务端参数白名单里', async () => {
    const violations: string[] = []

    for (const moduleKey of MODULES) {
      const config = await loadBusinessPageConfig(moduleKey)
      const endpoint = getModuleConfig(moduleKey)
      const allowed = new Set<string>([
        ...(endpoint.nativeFilterKeys ?? []),
        // 日期区间筛选在配置里用单一 key（如 orderDate），实际发的是 start/end 两个参数
        ...Object.keys(endpoint.dateRangeMapping ?? {}),
      ])

      for (const filter of config?.filters ?? []) {
        if (!allowed.has(filter.key)) {
          violations.push(
            `${moduleKey}: 筛选器 "${filter.key}" 未登记在 nativeFilterKeys/dateRangeMapping 中` +
              ` —— 该控件会渲染，但请求不会携带此参数（筛选静默失效）`,
          )
        }
      }
    }

    expect(violations).toEqual([])
  })

  /**
   * 商品信息筛选专项：只覆盖**本次接入**的 4 个模块，断言「控件 + 白名单」两侧都在。
   *
   * <p>销售订单与销售出库**不在此列**：它们的 productKeyword 控件是被
   * `b9a67822 feat(filters): 销售订单与销售出库筛选移除商品关键字与结算主体`
   * 主动移除的产品决策，虽然白名单里仍留着 key（后端也仍支持），但这是既有状态，
   * 不属于本次范围，也不应在这里被悄悄改回来。若将来要恢复，把模块加进下面的数组即可。</p>
   */
  const MODULES_WITH_PRODUCT_FILTER = [
    'purchase-order',
    'purchase-inbound',
    'sales-return',
    'freight-bill',
  ] as const satisfies readonly ModuleKey[]

  it('本次接入的 4 个单据列表页都已具备「商品信息」筛选（控件与白名单两侧）', async () => {
    const missing: string[] = []

    for (const moduleKey of MODULES_WITH_PRODUCT_FILTER) {
      const config = await loadBusinessPageConfig(moduleKey)
      const hasFilter = (config?.filters ?? []).some(
        (filter) => filter.key === 'productKeyword',
      )
      const hasContract = (
        getModuleConfig(moduleKey).nativeFilterKeys ?? []
      ).includes('productKeyword')

      if (!hasFilter) missing.push(`${moduleKey}: 缺少 productKeyword 筛选控件`)
      if (!hasContract) missing.push(`${moduleKey}: 白名单缺少 productKeyword`)
    }

    expect(missing).toEqual([])
  })
})
