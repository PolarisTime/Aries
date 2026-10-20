import type { PriceSheet, ProjectOption } from './types'

export const TOUR_KEY = 'aries-price-compare-tour'

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
