import i18n from 'i18next'
import type { PriceSheet, ProjectOption } from './types'

export const TOUR_KEY = 'aries-price-compare-tour'

/** 报单比价页的路由路径(多标签页 keep-alive 下用于判断是否仍停留在该路由)。 */
export const PRICE_COMPARE_ROUTE = '/price-compare'

export function projectAbbrOf(
  projects: ProjectOption[],
  projectId: string,
  fallback: string,
): string {
  for (const project of projects) {
    if (project.id === projectId) return project.abbr || project.name
  }
  return fallback || i18n.t('priceCompare.sheet.unspecifiedProject')
}

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
 * 按值增删一个字符串集合成员(返回新数组, 不改原数组)。
 * 例: 品牌列显隐 —— visible 为 true 时移除, 为 false 时加入(已存在则原样返回, 保持引用稳定)。
 */
export function withMemberVisibility(
  list: string[],
  value: string,
  visible: boolean,
): string[] {
  if (visible) return list.filter((item) => item !== value)
  return list.includes(value) ? list : [...list, value]
}
