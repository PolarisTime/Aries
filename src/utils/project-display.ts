import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/**
 * 项目名的**显示口径** —— 唯一来源(本仓库禁止同一口径两处实现)。
 *
 * <p>四条业务列表(销售订单 / 销售出库 / 销售退货 / 客户对账单)的「项目名称」列与打印中心的
 * 项目摘要都取这里的结果, 不要就地另拼 `简称（全称）`。</p>
 *
 * - 简称 + 全称: `简称（全称）`，例如 `东钢（广东东钢供应链有限公司）`；
 * - 只有其中一个: 显示存在的那个(无简称时只显示全称)；
 * - 都为空: 空串(列表单元格由 {@link renderProjectNameCell} 回退 `-`)。
 *
 * <p>后端未返回 `projectNameAbbr`(例如该批后端字段尚未上线)时, `undefined`/`null` 都被当成
 * "无简称", 自动退化为只显示全称 —— 调用方不需要判断字段是否存在。</p>
 */
export function formatProjectDisplayName(
  projectNameAbbr: unknown,
  projectName: unknown,
): string {
  const abbr = asString(projectNameAbbr).trim()
  const name = asString(projectName).trim()
  if (abbr && name) return `${abbr}（${name}）`
  return abbr || name
}

/**
 * 「项目名称」列表列的渲染口径: 格式同 {@link formatProjectDisplayName}, 两者都空时回退
 * `-`(与其它列的空值展示一致)。
 *
 * <p>返回纯文本而不是自造节点: antd 的 `ellipsis` 会把完整文本写进单元格 `title`,
 * 悬停即可看到全称, 不需要再加 tooltip。</p>
 */
export function renderProjectNameCell(
  _value: unknown,
  record: ModuleRecord,
): string {
  const text = formatProjectDisplayName(
    record.projectNameAbbr,
    record.projectName,
  )
  return text || '-'
}
