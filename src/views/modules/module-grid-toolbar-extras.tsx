/**
 * 列表页工具栏附加操作 per-module 注册表：物料导入、采购订单取货单等
 * 模块专属入口收敛到这里，消费方只查表渲染，不再书写 `moduleKey === 'xxx'` 比较。
 */
import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { ModuleRecord } from '@/types/module-page'
import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'
import { PurchaseOrderPickupListAction } from '@/views/modules/components/PurchaseOrderPickupListAction'

export interface ModuleGridToolbarExtraProps {
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  canExportData: boolean
  canUpdateRecord: boolean
  refreshModuleQueries: () => Promise<void>
}

const MODULE_GRID_TOOLBAR_EXTRAS = {
  material: ({
    canExportData,
    canUpdateRecord,
    refreshModuleQueries,
  }: ModuleGridToolbarExtraProps) => (
    <MaterialImportActions
      canDownloadTemplate={canExportData}
      canImport={canUpdateRecord}
      onImported={refreshModuleQueries}
    />
  ),
  'purchase-order': ({ selectedRowKeys }: ModuleGridToolbarExtraProps) =>
    selectedRowKeys.length ? (
      <PurchaseOrderPickupListAction selectedOrderIds={selectedRowKeys} />
    ) : null,
} satisfies Partial<
  Record<ModuleKey, (props: ModuleGridToolbarExtraProps) => React.ReactNode>
>

/** 渲染模块专属工具栏附加操作；未注册模块返回 null。 */
export function renderModuleGridToolbarExtra(
  moduleKey: string,
  props: ModuleGridToolbarExtraProps,
): React.ReactNode {
  if (!isModuleKey(moduleKey)) return null
  const renderer = (
    MODULE_GRID_TOOLBAR_EXTRAS as Partial<
      Record<ModuleKey, (props: ModuleGridToolbarExtraProps) => React.ReactNode>
    >
  )[moduleKey]
  return renderer?.(props) ?? null
}
