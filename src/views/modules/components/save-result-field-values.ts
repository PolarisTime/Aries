import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import { asString } from '@/utils/type-narrowing'

/**
 * 保存回执的字段取值口径 —— **唯一出口**。
 *
 * <p>单独成文件而不是留在 `SaveResultFieldSummary.tsx`：组件文件导出非组件函数会让
 * Fast Refresh 无法保留组件状态（react-doctor `only-export-components`），而且这段是纯
 * 数据映射、可独立单测。</p>
 */

/**
 * 表单字段 key → 记录上的「显示名」key。
 *
 * <p>单据表单里的归属字段用的是外键（`customerId` / `projectId` / `settlementCompanyId`），
 * 而列表列与详情用的都是同一份快照上的显示名（`customerName` / `projectName` /
 * `settlementCompanyName`）。雪花 ID 本身是产品刻意保留的设计，**这里修的是
 * 「该显示名字段显示了 ID」**：回执是用户核对「我刚存对了吗」的唯一界面，
 * 19 位数字放在「客户名称」后面核对不了任何东西（审查报告 P1-5）。</p>
 *
 * <p>命名约定与编辑器下拉的折回快照同源（`form-field-renderer-utils.ts` 的
 * `getSnapshotLabelKey`）：`<key 去掉 Id 后缀> + Name`。</p>
 */
export function resolveSummaryDisplayNameKey(fieldKey: string) {
  return fieldKey.endsWith('Id') && fieldKey.length > 2
    ? `${fieldKey.slice(0, -2)}Name`
    : ''
}

/**
 * 回执里某字段该显示什么。
 *
 * <p>优先显示名；显示名为空时回退原值 —— 回退是**有意的**：雪花 ID 是刻意设计，
 * 回执不能因为取不到名称就整行消失，否则用户会以为字段没保存。</p>
 */
export function resolveSummaryDisplayValue(
  record: object,
  fieldKey: string,
): unknown {
  const displayNameKey = resolveSummaryDisplayNameKey(fieldKey)
  if (displayNameKey) {
    const displayName = asString(
      readModuleRecordField(record, displayNameKey),
    ).trim()
    if (displayName) return displayName
  }
  return readModuleRecordField(record, fieldKey)
}
