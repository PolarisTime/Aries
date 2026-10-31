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

/** 品牌网格的查询键：与「从价格表带价」同源, 保存后统一失效。 */
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

/** 未保存草稿的本地存储键：刷新/误关页后能恢复，避免一次报价白录。 */
export const draftsKey = (supplierId: string) =>
  `aries:supplier-quote-drafts:${supplierId}`

/** 单元格标识：品牌 + 行键，用于键盘移动与粘贴定位（用不可见分隔符避免品牌名里的 `:`）。 */
export const cellIdOf = (brandName: string, rowKey: string) =>
  `${brandName}\u0000${rowKey}`
