import type { TableColumnsType } from 'antd'
import type { TFunction } from 'i18next'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type { ModulePageConfig } from '@/types/module-page'
import type { ModuleLineItem } from '@/types/module-record'
import type { SubmissionAction } from '@/views/modules/module-editor-workspace-support'

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
  /** 本次提交动作；缺省表示来源不明，退回通用成功文案。 */
  action?: SubmissionAction
  /** 保存后的主单号，用于文案里点明「刚存的是哪一张」。 */
  documentNo?: string
}

/**
 * 回执标题：按「本次动作 + 单据变成什么状态」区分，而不是三种动作共用一句「保存成功」。
 *
 * <p>草稿保存、保存并审核、核定并审核在回执里必须一眼可区分：用户要知道自己刚才只是存了
 * 草稿，还是已经提交了审核。文案带上单号，避免连点多次后分不清是哪一张。</p>
 */
export function resolveSaveResultTitle({
  config,
  isConflict,
  isSuccess,
  t,
  action,
  documentNo,
}: SaveResultTitleInput) {
  if (isSuccess) {
    const params = { title: config.title, no: documentNo || '' }
    if (action === 'save-and-audit') {
      return t('modules.saveResult.savedAndAudited', params)
    }
    if (action === 'save-and-complete') {
      return t('modules.saveResult.verifiedAndAudited', params)
    }
    if (action === 'save') {
      return t('modules.saveResult.savedAsDraft', params)
    }
    return t('modules.saveResult.pageSuccess', { title: config.title })
  }
  if (isConflict) {
    return t('modules.saveResult.conflict')
  }
  return t('modules.saveResult.error')
}

/** 回执操作区可出现的动作种类（顺序由 {@link resolveSaveResultActions} 决定）。 */
export type SaveResultActionKind =
  | 'upload-attachment'
  | 'next-module'
  | 'create-another'
  | 'close'

/** 回执里「创建下一模块」的快捷入口：只有该模块存在明确的下一环时才注册。 */
export const NEXT_MODULE_PATHS: Record<
  string,
  { labelKey: string; path: string }
> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
  'sales-order': {
    labelKey: 'modules.nextModule.createSalesOutbound',
    path: '/sales-outbound',
  },
}

export interface SaveResultActionsInput {
  action?: SubmissionAction
  canCreateAnother: boolean
  canUploadAttachment: boolean
  /** 当前模块配置了「下一模块」快捷入口。 */
  hasNextModule: boolean
  isSuccess: boolean
}

/**
 * 回执按钮集合：只给**该状态下合法**的下一步。
 *
 * <p>关键取舍：下游单据只能关联**已生效**的单据，因此草稿回执不给「创建下一模块」；
 * 草稿态也不提供任何审核类动作——草稿的下一步是回到编辑器补全后再次提交，而不是在回执上
 * 直接审核（审核入口仍在编辑器与列表工具栏，权限判定不变）。</p>
 */
export function resolveSaveResultActions({
  action,
  canCreateAnother,
  canUploadAttachment,
  hasNextModule,
  isSuccess,
}: SaveResultActionsInput): SaveResultActionKind[] {
  if (!isSuccess) {
    // 失败/冲突：只能返回编辑或重载最新，没有任何推进动作。
    return ['close']
  }

  const isEffective =
    action === 'save-and-audit' || action === 'save-and-complete'
  const actions: SaveResultActionKind[] = []
  if (canUploadAttachment) {
    actions.push('upload-attachment')
  }
  if (isEffective && hasNextModule) {
    actions.push('next-module')
  }
  if (canCreateAnother) {
    actions.push('create-another')
  }
  actions.push('close')
  return actions
}
