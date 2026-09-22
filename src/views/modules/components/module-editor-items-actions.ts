import type { ReactNode } from 'react'
import type { ProjectOption } from '@/api/master/project-options'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'

interface BuildModuleItemsActionsContext {
  open: boolean
  moduleKey: ModuleKey
  config: ModulePageConfig
  formValues: Record<string, unknown>
  items: ModuleLineItem[]
  setItems: (updater: (items: ModuleLineItem[]) => ModuleLineItem[]) => void
  saving: boolean
  projectOptions: ProjectOption[]
}

/**
 * 组装明细工具栏附加操作：将编辑器上下文映射为 {@code config.renderItemsActions}。
 * 关闭或无配置时返回 null；项目选项裁剪为明细动作所需的最小契约。
 */
export function buildModuleItemsActions(
  ctx: BuildModuleItemsActionsContext,
): ReactNode {
  if (!ctx.open || !ctx.config.renderItemsActions) return null
  return ctx.config.renderItemsActions({
    formValues: ctx.formValues,
    items: ctx.items,
    setItems: ctx.setItems,
    saving: ctx.saving,
    projectOptions: ctx.projectOptions.map((option) => ({
      id: option.id,
      projectName: option.projectName,
      ...(option.priceFloatMode
        ? { priceFloatMode: option.priceFloatMode }
        : {}),
      ...(option.priceFloatValue !== undefined
        ? { priceFloatValue: option.priceFloatValue }
        : {}),
    })),
  })
}
