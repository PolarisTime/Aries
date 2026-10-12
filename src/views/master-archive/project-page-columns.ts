import type { useTranslation } from 'react-i18next'
import {
  DEFAULT_SCOPE_ENFORCEMENT,
  normalizeScopeEnforcement,
  type ProjectScopeEnforcement,
} from '@/api/master/project-options'
import { asString } from '@/utils/type-narrowing'

export const PROJECT_COLUMN_KEYS = [
  'projectCode',
  'projectName',
  'projectNameAbbr',
  'customerCode',
  'settlementCompanyName',
  'projectManager',
  'projectAddress',
  'status',
  'remark',
] as const

export type ProjectColumnKey = (typeof PROJECT_COLUMN_KEYS)[number]

export function displayProjectValue(value: unknown): string {
  const normalized = asString(value).trim()
  return normalized || '-'
}

/**
 * 项目允许品牌/材质的多值字段归一化: 只保留去重后的非空字符串, 非数组按「未配置」处理。
 * <p>
 * 列表行来自 looseObject 记录, 后端可能返回 null/字符串/数组, 这里统一收敛成数组,
 * 供编辑表单初值与详情展示共用, 避免两处各写一套判断而漂移。
 */
export function toAllowedSpecValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const entry of value) {
    const text = asString(entry).trim()
    if (text && !seen.has(text)) {
      seen.add(text)
      normalized.push(text)
    }
  }
  return normalized
}

/**
 * 列表行的处理方式归一化: 清单为空(不限制)时返回 null, 由表单回落到「提醒」默认值。
 * <p>
 * 与 {@link toAllowedSpecValues} 配套使用: 两者都只依赖列表行原始值, 供编辑表单初值与
 * 保存载荷共用, 避免「回填一套、保存另一套」的漂移。
 */
export function toAllowedSpecSeverity(
  value: unknown,
  allowedValues: readonly string[],
): ProjectScopeEnforcement | null {
  if (!allowedValues.length) {
    return null
  }
  if (value == null || asString(value).trim() === '') {
    return DEFAULT_SCOPE_ENFORCEMENT
  }
  return normalizeScopeEnforcement(value)
}

export function buildProjectColumnLabels(
  t: ReturnType<typeof useTranslation>['t'],
): Record<ProjectColumnKey, string> {
  return {
    projectCode: t('modules.pages.project.projectCode'),
    projectName: t('modules.pages.project.projectName'),
    projectNameAbbr: t('modules.pages.project.projectNameAbbr'),
    customerCode: t('modules.pages.project.customer'),
    settlementCompanyName: t('modules.pages.project.settlementCompany'),
    projectManager: t('modules.pages.project.projectManager'),
    projectAddress: t('modules.pages.project.projectAddress'),
    status: t('modules.columns.status'),
    remark: t('modules.columns.remark'),
  }
}
