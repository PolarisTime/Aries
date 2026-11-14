import type {
  SupplierPriceColumn,
  SupplierPriceGrid,
} from '@/api/market/supplier-price-lists'
import type { ServerCell } from './supplier-price-list-model'

/**
 * 供应商报价页的本地视图偏好与单元格标识（从 `SupplierQuotePage.tsx` 抽出的独立职责）。
 *
 * <p>只处理「按供应商隔离的 localStorage 键 + 读取 + 单元格 id 拼接」，
 * 不依赖 React；刷新/换供应商后仍能恢复各自顺序、隐藏列与未保存草稿。</p>
 */

/** 一个品牌列视图：是否已有价格表 + 该列服务端价格索引 + 原始网格。 */
export type BrandColumnView = {
  brandName: string
  grid: SupplierPriceGrid | undefined
  column: SupplierPriceColumn | null
  cells: Map<string, ServerCell>
}

/** 品牌网格的查询键：与「从供应商价格表导入」同源, 保存后统一失效。 */
export const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/** 列显示偏好的本地存储键：按供应商隔离，换供应商各自记各自的顺序与隐藏列。 */
export const brandPrefsKey = (supplierId: string) =>
  `aries:supplier-quote-prefs:${supplierId}`

/** 视图偏好：品牌成列（现状）/ 规格横置（品牌分块，规格作列头，贴近纸质报价单）。 */
export type QuoteViewMode = 'brands' | 'specs'

/**
 * 价格录入方式。
 *
 * <ul>
 *   <li>{@code base} 基价模式：每个品牌只填「基价」一格，其余规格按「基价 + 加价」自动算好且只读；</li>
 *   <li>{@code manual} 手填模式：逐格录入，系统不会替你算任何价格。</li>
 * </ul>
 *
 * <p>两种方式互斥：手填模式下即使填了基价格子也不联动，否则业务员分不清哪个价是自己填的。</p>
 */
export type PriceEntryMode = 'base' | 'manual'

export const viewModeKey = (supplierId: string) =>
  `aries:supplier-quote-view:${supplierId}`

export const readViewMode = (supplierId: string): QuoteViewMode =>
  window.localStorage.getItem(viewModeKey(supplierId)) === 'specs'
    ? 'specs'
    : 'brands'

export const priceModeKey = (supplierId: string) =>
  `price-compare:supplier-price-mode:${supplierId}`

export const readPriceMode = (supplierId: string): PriceEntryMode =>
  window.localStorage.getItem(priceModeKey(supplierId)) === 'base'
    ? 'base'
    : 'manual'

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

/** 单元格标识：品牌 + 行键，用于键盘移动与粘贴定位（用不可见分隔符避免品牌名里的 `:`）。 */
export const cellIdOf = (brandName: string, rowKey: string) =>
  `${brandName}\u0000${rowKey}`
