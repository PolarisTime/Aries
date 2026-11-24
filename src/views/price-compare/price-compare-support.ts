import {
  readScopedSettingsItem,
  removeScopedSettingsItem,
  writeScopedSettingsItem,
} from '@/services/user-settings-sync'
import type { PriceSheet, ProjectOption } from './types'

export const TOUR_KEY = 'aries-price-compare-tour'

/** 报单比价上次停留的项目/批次（按账号隔离，避免切去其他页面再切回时落回首个项目）。 */
export const LAST_PRICE_COMPARE_SELECTION_KEY =
  'aries:price-compare-last-selection'

export interface LastPriceCompareSelection {
  projectId?: string
  sheetId?: string
}

/** 读取上次在报单比价停留的项目与批次；解析失败或为空一律按无存档处理。 */
export function readLastPriceCompareSelection(): LastPriceCompareSelection | null {
  const raw = readScopedSettingsItem(LAST_PRICE_COMPARE_SELECTION_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    const record = parsed as Record<string, unknown>
    const projectId =
      typeof record.projectId === 'string' && record.projectId.trim()
        ? record.projectId.trim()
        : undefined
    const sheetId =
      typeof record.sheetId === 'string' && record.sheetId.trim()
        ? record.sheetId.trim()
        : undefined
    if (!projectId && !sheetId) return null
    return {
      ...(projectId ? { projectId } : {}),
      ...(sheetId ? { sheetId } : {}),
    }
  } catch {
    return null
  }
}

/** 写入当前在报单比价停留的项目与批次；均为空时清除本地键。 */
export function writeLastPriceCompareSelection(
  selection: LastPriceCompareSelection,
): void {
  const projectId = selection.projectId?.trim() || undefined
  const sheetId = selection.sheetId?.trim() || undefined
  if (!projectId && !sheetId) {
    removeScopedSettingsItem(LAST_PRICE_COMPARE_SELECTION_KEY)
    return
  }
  writeScopedSettingsItem(
    LAST_PRICE_COMPARE_SELECTION_KEY,
    JSON.stringify({
      ...(projectId ? { projectId } : {}),
      ...(sheetId ? { sheetId } : {}),
    }),
  )
}

/**
 * 首次进入/切回报单比价时应激活哪一张单据（唯一判定出口）。
 *
 * <p>单页导航切到其他页面再切回会重新挂载本页；此前一律取服务端第一张单据
 * （如「仓库」项目），导致反复重选项目。这里按以下优先级恢复：</p>
 * <ol>
 *   <li>优先回到上次停留的那一张批次（`sheetId` 命中）；</li>
 *   <li>该批次已被删除或当时尚未落库 → 回到上次停留项目的第一个批次（`projectId` 命中）；</li>
 *   <li>两者均不存在（首次进入或项目已无批次）→ 回落到列表第一张单据。</li>
 * </ol>
 */
export function resolveInitialActiveSheetId(
  sheets: readonly Pick<PriceSheet, 'id' | 'projectId'>[],
  stored: LastPriceCompareSelection | null,
): string | undefined {
  if (!sheets.length) return undefined
  if (stored?.sheetId) {
    const matchedSheet = sheets.find((sheet) => sheet.id === stored.sheetId)
    if (matchedSheet) return matchedSheet.id
  }
  if (stored?.projectId) {
    const matchedProject = sheets.find(
      (sheet) => sheet.projectId === stored.projectId,
    )
    if (matchedProject) return matchedProject.id
  }
  return sheets[0].id
}

/** 报单比价页的路由路径(多标签页 keep-alive 下用于判断是否仍停留在该路由)。 */
export const PRICE_COMPARE_ROUTE = '/price-compare'

export function projectGroupsOf(
  sheets: PriceSheet[],
): { projectId: string; projectName: string; sheets: PriceSheet[] }[] {
  const byId = new Map<
    string,
    { projectId: string; projectName: string; sheets: PriceSheet[] }
  >()
  for (const sheet of sheets) {
    let group = byId.get(sheet.projectId)
    if (!group) {
      group = {
        projectId: sheet.projectId,
        projectName: sheet.projectName,
        sheets: [],
      }
      byId.set(sheet.projectId, group)
    }
    group.sheets.push(sheet)
  }
  return [...byId.values()]
}

/**
 * 「在项目选择器里选中某个项目」之后该做什么 —— 唯一的判定出口。
 *
 * <p>重构后项目行只剩一个选择器，原来由两个控件分别承担的两件事（切到已有批次的项目、
 * 给还没批次的项目就地建一个批次）都收敛到这里：已有批次 → 切到它的**第一个**批次；
 * 还没有批次 → 建一个；项目清单里找不到（历史脏数据的 projectId）→ 什么都不做。</p>
 *
 * <p>抽成纯函数是为了让这条判定可被单测钉住 —— 它此前埋在组件的 onChange 里，
 * 只能靠渲染 antd Select 再去点选项才能覆盖。</p>
 */
export function resolveProjectSelection(
  projectId: string,
  projectGroups: { projectId: string; sheets: { id: string }[] }[],
  projects: ProjectOption[],
):
  | { type: 'select'; sheetId: string }
  | { type: 'create'; project: ProjectOption }
  | null {
  const group = projectGroups.find((item) => item.projectId === projectId)
  if (group?.sheets[0]) {
    return { type: 'select', sheetId: group.sheets[0].id }
  }
  const project = projects.find((item) => item.id === projectId)
  return project ? { type: 'create', project } : null
}
