/**
 * 供应商报价页的本地视图偏好（从 `SupplierQuotePage.tsx` 抽出的独立职责）。
 *
 * <p>只处理「按供应商隔离的 localStorage 键 + 读取」，不依赖 React；
 * 刷新/换供应商后仍能恢复各自打开的供应商页签、材质 tab 与未保存草稿。</p>
 */

/** 品牌网格的查询键：与「从供应商价格表导入」同源, 保存后统一失效。 */
export const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/**
 * 已打开的供应商页签 + 当前激活页签的本地存储键。
 *
 * <p>为什么要有：标签页是**按需打开**的内存状态（`useState<string[]>([])`），刷新后只剩
 * 默认的第一个供应商 —— 用户加进去的第二、第三个供应商连同它们的激活位置一起消失，
 * 每次回来都要重新挑一遍。与草稿/列偏好同属本页的本地视图偏好，因此放在同一个模块。</p>
 */
export const supplierTabsKey = 'aries:supplier-quote-tabs'

export interface StoredSupplierTabs {
  openSupplierIds: string[]
  activeSupplierId?: string
}

/**
 * 读取上次打开的供应商页签。
 *
 * <p>只做形状校验（字符串数组 + 可选字符串），**不校验 id 是否还存在** —— 供应商主数据
 * 是异步加载的，调用方拿到列表后再用 `filter(validIds.has)` 收敛。解析失败一律当作没有存档。</p>
 */
export function readSupplierTabs(): StoredSupplierTabs | null {
  try {
    const raw = window.localStorage.getItem(supplierTabsKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as {
      openSupplierIds?: unknown
      activeSupplierId?: unknown
    }
    const openSupplierIds = Array.isArray(candidate.openSupplierIds)
      ? candidate.openSupplierIds.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      : []
    if (openSupplierIds.length === 0) return null
    return {
      openSupplierIds,
      ...(typeof candidate.activeSupplierId === 'string' &&
      candidate.activeSupplierId
        ? { activeSupplierId: candidate.activeSupplierId }
        : {}),
    }
  } catch {
    return null
  }
}

export function writeSupplierTabs(tabs: StoredSupplierTabs): void {
  try {
    window.localStorage.setItem(
      supplierTabsKey,
      JSON.stringify({
        openSupplierIds: tabs.openSupplierIds,
        ...(tabs.activeSupplierId
          ? { activeSupplierId: tabs.activeSupplierId }
          : {}),
      }),
    )
  } catch {
    // 隐私模式 / 配额满：标签页恢复是辅助能力，写不进去不影响本次使用
  }
}

/**
 * 「品类 → 当前材质 tab」的本地存储键（按供应商隔离）。
 *
 * <p>直条 / 盘螺各有多个材质 tab（HRB400 / HRB400E / …），报价员通常一个材质报完再换下一个。
 * 这一项原先只在内存里，刷新后总是回到第一个材质 —— 与同页其它偏好（列顺序、视图模式、草稿）
 * 的行为不一致，也让「刷新后继续从刚才的位置报价」这件事做不到。</p>
 */
export const materialTabsKey = (supplierId: string) =>
  `aries:supplier-quote-material:${supplierId}`

/** 读取该供应商上次停留的材质 tab：品类名 → 材质名。 */
export function readMaterialTabs(supplierId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(materialTabsKey(supplierId))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return {}
    const result: Record<string, string> = {}
    for (const [categoryName, material] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (categoryName && typeof material === 'string' && material) {
        result[categoryName] = material
      }
    }
    return result
  } catch {
    return {}
  }
}

/**
 * 写入材质 tab 选择。
 *
 * <p>不校验「材质是否仍属于该供应商」—— 渲染侧 `materialTabsOf` 会按当前表集合回落
 * 到第一个材质，这里多一道校验只会让两处口径分叉。</p>
 */
export function writeMaterialTabs(
  supplierId: string,
  tabs: Record<string, string>,
): void {
  try {
    if (Object.keys(tabs).length === 0) {
      window.localStorage.removeItem(materialTabsKey(supplierId))
      return
    }
    window.localStorage.setItem(
      materialTabsKey(supplierId),
      JSON.stringify(tabs),
    )
  } catch {
    // 隐私模式 / 配额满：只是恢复偏好，写不进去不影响本次使用
  }
}

/** 未保存草稿的本地存储键：刷新/误关页后能恢复，避免一次报价白录。 */
export const draftsKey = (supplierId: string) =>
  `aries:supplier-quote-drafts:${supplierId}`

/** 草稿的结构：品牌 →（行键 → 价格；{@code null} 表示明确清空）。 */
export type StoredDrafts = Record<string, Record<string, number | null>>

/**
 * 读取该供应商上次未保存的草稿。
 *
 * <p>为什么必须有：自动保存有 800ms 防抖，保存失败（网络/版本冲突）还会把改动留在内存里；
 * 只要用户在这个窗口内切页或刷新，改动就静默消失、只能重敲。原界面把草稿写进 localStorage
 * 并在回到页面时提示「已恢复 / 放弃」，重做工作台时这段能力丢了，2026-11-03 补回。</p>
 *
 * <p>解析失败（人工改坏 / 旧版本结构）一律当作没有草稿，不抛错 —— 草稿是辅助，
 * 不能因为它坏了就打不开页面。</p>
 */
export function readDrafts(supplierId: string): StoredDrafts {
  try {
    const raw = window.localStorage.getItem(draftsKey(supplierId))
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: StoredDrafts = {}
    for (const [brandName, draft] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!brandName || !draft || typeof draft !== 'object') continue
      const prices: Record<string, number | null> = {}
      for (const [rowKey, value] of Object.entries(
        draft as Record<string, unknown>,
      )) {
        if (value === null) {
          prices[rowKey] = null
        } else if (typeof value === 'number' && Number.isFinite(value)) {
          prices[rowKey] = value
        }
      }
      if (Object.keys(prices).length) result[brandName] = prices
    }
    return result
  } catch {
    return {}
  }
}

/** 写入（空则删除）该供应商的未保存草稿；写失败（隐私模式/配额）静默忽略。 */
export function writeDrafts(supplierId: string, drafts: StoredDrafts): void {
  try {
    if (!Object.keys(drafts).length) {
      window.localStorage.removeItem(draftsKey(supplierId))
      return
    }
    window.localStorage.setItem(draftsKey(supplierId), JSON.stringify(drafts))
  } catch {
    // 存不下不影响本次录入：内存里的草稿仍在，自动保存照常跑
  }
}
