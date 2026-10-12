import type { TableColumnsType } from 'antd'
import type { TFunction } from 'i18next'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type { ModulePageConfig } from '@/types/module-page'
import type { ModuleLineItem } from '@/types/module-record'

/**
 * SaveResultOverlay 的纯计算部分。
 *
 * <p>抽出原因：保存结果弹窗把「明细提取 → 只读列构建 → 标题文案选取」与三块
 * 渲染塞在同一个函数里，控制流复杂度远超 react-doctor 阈值
 * (no-high-complexity-react-function)。这些都是无 React 依赖的映射，
 * 搬成纯函数后组件只剩「按状态渲染哪一块」。</p>
 */

/**
 * 保存回执里的明细：后端回执的 items 可能是任意对象数组，
 * 逐项浅拷贝成 ModuleLineItem，非对象项直接丢弃（与改造前一致）。
 */
export function resolveSaveResultItems(record: object | null | undefined) {
  const rawItems = readModuleRecordField(record, 'items')
  return Array.isArray(rawItems)
    ? rawItems.flatMap((item) =>
        item && typeof item === 'object'
          ? [Object.fromEntries(Object.entries(item)) as ModuleLineItem]
          : [],
      )
    : []
}

/**
 * 只读明细列：由模块配置的保存结果摘要投影提供，组件不再维护模块字段白名单，
 * 与编辑器表格共用 formatCellValue 渲染。
 */
export function buildSaveResultItemColumns(
  config: ModulePageConfig,
  formatCellValue: (value: unknown, columnType?: string) => string,
): TableColumnsType<ModuleLineItem> {
  return (config.saveResultItemColumns ?? config.itemColumns ?? []).map(
    (column) => ({
      title: column.title,
      dataIndex: column.dataIndex,
      ellipsis: true,
      align: column.align || ('center' as const),
      render: (value: unknown) =>
        value == null || value === ''
          ? '-'
          : formatCellValue(value, column.type),
    }),
  )
}

export interface SaveResultTitleInput {
  config: ModulePageConfig
  isConflict: boolean
  isSuccess: boolean
  t: TFunction
}

/** 回执标题：成功/并发冲突/其它错误三种文案。 */
export function resolveSaveResultTitle({
  config,
  isConflict,
  isSuccess,
  t,
}: SaveResultTitleInput) {
  if (isSuccess) {
    return t('modules.saveResult.pageSuccess', { title: config.title })
  }
  if (isConflict) {
    return t('modules.saveResult.conflict')
  }
  return t('modules.saveResult.error')
}
