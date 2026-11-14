/**
 * 供应商报价页的本地视图偏好（从 `SupplierQuotePage.tsx` 抽出的独立职责）。
 *
 * <p>只处理「按供应商隔离的 localStorage 键 + 读取」，不依赖 React；
 * 刷新/换供应商后仍能恢复各自打开的供应商页签、材质 tab 与未保存草稿。</p>
 *
 * <p>跨端同步（docs/client-state-sync.md §6.3）：页签与材质 tab 同时写进
 * `supplierQuote` 分片；本地键按账号隔离（`<key>:<userKey>`），老键首次读取时一次性迁移。
 * 草稿**不同步**（§6.5：未验证的中间态不共享），仍只留本机。</p>
 */

import {
  patchUserSection,
  readScopedSettingsItem,
  readSection,
  removeScopedSettingsItem,
  writeScopedSettingsItem,
} from '@/services/user-settings-sync'

/** 品牌网格的查询键：与「从供应商价格表导入」同源, 保存后统一失效。 */
export const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/**
 * 已打开的供应商页签 + 当前激活页签的本地存储**基础键**（实际读写按账号加后缀）。
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
 * 「品类 → 当前材质 tab」的本地存储**基础键**（按供应商隔离，实际读写按账号加后缀）。
 *
 * <p>直条 / 盘螺各有多个材质 tab（HRB400 / HRB400E / …），报价员通常一个材质报完再换下一个。
 * 这一项原先只在内存里，刷新后总是回到第一个材质 —— 与同页其它偏好（列顺序、视图模式、草稿）
 * 的行为不一致，也让「刷新后继续从刚才的位置报价」这件事做不到。</p>
 */
export const materialTabsKey = (supplierId: string) =>
  `aries:supplier-quote-material:${supplierId}`

/** `supplierQuote` 分片的结构（docs/client-state-sync.md §4.3）。 */
export interface SupplierQuoteSectionValue {
  openSupplierIds?: unknown
  activeSupplierId?: unknown
  materialTabs?: unknown
}

const SUPPLIER_QUOTE_SECTION = 'supplierQuote'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 解析页签存档：只做形状校验（字符串数组 + 可选字符串），坏数据一律当作没有存档。 */
function parseStoredTabs(value: unknown): StoredSupplierTabs | null {
  if (!isRecord(value)) return null
  const openSupplierIds = Array.isArray(value.openSupplierIds)
    ? value.openSupplierIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      )
    : []
  if (openSupplierIds.length === 0) return null
  return {
    openSupplierIds,
    ...(typeof value.activeSupplierId === 'string' && value.activeSupplierId
      ? { activeSupplierId: value.activeSupplierId }
      : {}),
  }
}

/** 解析材质 tab：品类 → 材质名；非法成员逐个丢弃。 */
function parseMaterialTabs(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  const result: Record<string, string> = {}
  for (const [categoryName, material] of Object.entries(value)) {
    if (categoryName && typeof material === 'string' && material) {
      result[categoryName] = material
    }
  }
  return result
}

function writeLocalSupplierTabs(tabs: StoredSupplierTabs): void {
  writeScopedSettingsItem(
    supplierTabsKey,
    JSON.stringify({
      openSupplierIds: tabs.openSupplierIds,
      ...(tabs.activeSupplierId
        ? { activeSupplierId: tabs.activeSupplierId }
        : {}),
    }),
  )
}

function writeLocalMaterialTabs(
  supplierId: string,
  tabs: Record<string, string>,
): void {
  if (Object.keys(tabs).length === 0) {
    removeScopedSettingsItem(materialTabsKey(supplierId))
    return
  }
  writeScopedSettingsItem(materialTabsKey(supplierId), JSON.stringify(tabs))
}

/**
 * 读取上次打开的供应商页签。
 *
 * <p>只做形状校验（字符串数组 + 可选字符串），**不校验 id 是否还存在** —— 供应商主数据
 * 是异步加载的，调用方拿到列表后再用 `filter(validIds.has)` 收敛。解析失败一律当作没有存档。
 * 本地没有时回落到 `supplierQuote` 分片（远端已落地但本机还没写过的情况）。</p>
 */
export function readSupplierTabs(): StoredSupplierTabs | null {
  const raw = readScopedSettingsItem(supplierTabsKey)
  if (raw) {
    try {
      return parseStoredTabs(JSON.parse(raw))
    } catch {
      return null
    }
  }
  return parseStoredTabs(
    readSection<SupplierQuoteSectionValue>(SUPPLIER_QUOTE_SECTION),
  )
}

/**
 * 写入页签选择：先写本地（UI 立即生效），再进同步分片。
 *
 * <p>空页签列表不当作存档：避免用户关光页签后刷新又冒出来（本地键删除，分片里记空数组）。</p>
 */
export function writeSupplierTabs(tabs: StoredSupplierTabs): void {
  if (tabs.openSupplierIds.length > 0) {
    writeLocalSupplierTabs(tabs)
  } else {
    removeScopedSettingsItem(supplierTabsKey)
  }

  patchUserSection(SUPPLIER_QUOTE_SECTION, (current: unknown) => {
    const base = isRecord(current) ? current : {}
    return {
      ...base,
      openSupplierIds: tabs.openSupplierIds,
      activeSupplierId: tabs.activeSupplierId,
    }
  })
}

/** 读取该供应商上次停留的材质 tab：品类名 → 材质名。 */
export function readMaterialTabs(supplierId: string): Record<string, string> {
  const raw = readScopedSettingsItem(materialTabsKey(supplierId))
  if (raw) {
    try {
      return parseMaterialTabs(JSON.parse(raw))
    } catch {
      return {}
    }
  }
  const section = readSection<SupplierQuoteSectionValue>(SUPPLIER_QUOTE_SECTION)
  const materialTabs = isRecord(section?.materialTabs)
    ? section.materialTabs
    : null
  return materialTabs ? parseMaterialTabs(materialTabs[supplierId]) : {}
}

/**
 * 写入材质 tab 选择：先写本地，再按 supplierId 合并进 `supplierQuote` 分片
 * （不同供应商互不覆盖，见 §7）。
 *
 * <p>不校验「材质是否仍属于该供应商」—— 渲染侧 `materialTabsOf` 会按当前表集合回落
 * 到第一个材质，这里多一道校验只会让两处口径分叉。</p>
 */
export function writeMaterialTabs(
  supplierId: string,
  tabs: Record<string, string>,
): void {
  writeLocalMaterialTabs(supplierId, tabs)

  patchUserSection(SUPPLIER_QUOTE_SECTION, (current: unknown) => {
    const base = isRecord(current) ? current : {}
    const currentTabs = isRecord(base.materialTabs) ? base.materialTabs : {}
    const nextTabs: Record<string, unknown> = { ...currentTabs }
    if (Object.keys(tabs).length === 0) {
      delete nextTabs[supplierId]
    } else {
      nextTabs[supplierId] = tabs
    }
    return { ...base, materialTabs: nextTabs }
  })
}

/**
 * 远端 `supplierQuote` 分片落地：只写本地键，**不再回写分片**（避免远端值被立刻重新上传）。
 *
 * <p>由同步接线（`services/user-settings-bindings.ts`）在分片到达时调用；页面下次挂载
 * 通过 {@link readSupplierTabs} / {@link readMaterialTabs} 读到。</p>
 */
export function applyRemoteSupplierQuoteSection(value: unknown): void {
  if (!isRecord(value)) return
  const tabs = parseStoredTabs(value)
  if (tabs) {
    writeLocalSupplierTabs(tabs)
  } else {
    removeScopedSettingsItem(supplierTabsKey)
  }
  if (!isRecord(value.materialTabs)) return
  for (const [supplierId, materialTabs] of Object.entries(value.materialTabs)) {
    if (!supplierId) continue
    writeLocalMaterialTabs(supplierId, parseMaterialTabs(materialTabs))
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
 * 不能因为它坏了就打不开页面。草稿**不参与跨端同步**（§6.5）。</p>
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
