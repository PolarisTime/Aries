/**
 * 列表页工具栏附加操作 per-module 注册表：物料导入、采购订单取货单等
 * 模块专属入口收敛到这里，消费方只查表渲染，不再书写 `moduleKey === 'xxx'` 比较。
 */
import type { ModuleKey } from '@/module-system/core/module-key'
import { isModuleKey } from '@/module-system/core/module-key'
import type { ModuleRecord } from '@/types/module-page'
import { MaterialImportActions } from '@/views/modules/components/MaterialImportActions'
import { PurchaseOrderDocumentFlowAction } from '@/views/modules/components/PurchaseOrderDocumentFlowAction'
import { PurchaseOrderForceCloseAction } from '@/views/modules/components/PurchaseOrderForceCloseAction'
import { PurchaseOrderPickupListAction } from '@/views/modules/components/PurchaseOrderPickupListAction'
import { SalesOrderDocumentFlowAction } from '@/views/modules/components/SalesOrderDocumentFlowAction'
import { SalesReturnSourceImportAction } from '@/views/modules/components/SalesReturnSourceImportAction'

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
  'purchase-order': ({
    selectedRowKeys,
    selectedRows,
    refreshModuleQueries,
  }: ModuleGridToolbarExtraProps) => (
    <>
      {/*
       * 强制结单只在选中一条单据时才有意义，未选中直接不渲染。
       *
       * <p>此前无条件渲染、未选中时禁用并给出「请选择一条采购订单」提示：工具栏上长期
       * 挂着一个点不动的按钮，用户要先读提示才知道它需要先选行。现在与下面的「查看提货
       * 清单」同一口径——勾选后才出现。</p>
       */}
      {selectedRowKeys.length ? (
        <PurchaseOrderForceCloseAction
          selectedRows={selectedRows}
          refreshModuleQueries={refreshModuleQueries}
        />
      ) : null}
      {selectedRowKeys.length ? (
        <PurchaseOrderPickupListAction selectedOrderIds={selectedRowKeys} />
      ) : null}
      <PurchaseOrderDocumentFlowAction selectedRows={selectedRows} />
    </>
  ),
  'purchase-inbound': ({ selectedRows }: ModuleGridToolbarExtraProps) => (
    <PurchaseOrderDocumentFlowAction selectedRows={selectedRows} />
  ),
  'sales-order': ({ selectedRows }: ModuleGridToolbarExtraProps) => (
    <SalesOrderDocumentFlowAction selectedRows={selectedRows} />
  ),
  'sales-return': ({ refreshModuleQueries }: ModuleGridToolbarExtraProps) => (
    <SalesReturnSourceImportAction
      refreshModuleQueries={refreshModuleQueries}
    />
  ),
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
