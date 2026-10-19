import type { TableColumnsType, TableProps } from 'antd'
import { Tabs } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreatedExpenseMaterial } from '@/api/master/materials'
import type { RowContextMenuMap } from '@/components/row-context-menu'
import type { MaterialSearchController } from '@/module-system/editor/module-editor-material-select'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import type {
  FreightStatementSortDirection,
  FreightStatementSortMode,
} from '@/views/modules/freight-statement-item-groups'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import { EditorFooterActions } from './EditorFooterActions'
import { ModuleEditorExpensePanel } from './ModuleEditorExpensePanel'
import { ModuleItemGroupsView } from './ModuleItemGroupsView'
import { ModuleItemsPanel } from './ModuleItemsPanel'
import { ModuleItemsToolbarActions } from './ModuleItemsToolbarActions'
import { ModuleParentSelectorHost } from './ModuleParentSelectorHost'
import { buildModuleItemGroups } from './module-item-groups'

interface Props {
  config: ModulePageConfig
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
  expenseSelectedItemIds: string[]
  expenseMaterialOptions: Array<{
    label: string
    value: string
    unit?: string
    materialType?: string
  }>
  expenseMaterialSearch: MaterialSearchController
  supportsExpenseTab: boolean
  selectedItemIds: string[]
  parentImportVisible: boolean
  parentImporting: boolean
  parentSelectorDisplayFieldKey?: string
  parentSelectorFilters: SearchParams
  parentSelectorModuleKey?: string
  parentSelectorOpen: boolean
  itemColumns: TableColumnsType<ModuleLineItem>
  itemTableComponents: TableProps<ModuleLineItem>['components']
  itemColumnOrder: string[]
  itemRowMenus?: RowContextMenuMap
  visibleItemColumnKeys: string[]
  capabilities: {
    addManualItems: boolean
    importParentItems: boolean
    autoSortItems: boolean
    save: boolean
    audit: boolean
  }
  auditLabel?: string
  saving: boolean
  /**
   * 是否在明细工具栏里渲染「取消 / 保存 / 保存并审核」。
   *
   * <p>为 true 时这两个页签（货物明细 / 附加费用）**都会渲染同一条工具栏**：货物页签是
   * 完整工具栏（添加明细 / 导入 / 自动排序 / 列设置 / 删除选中 + 保存组），费用页签只保留
   * 保存组（其余动作是货物专属，不适用）。这样按钮回到工具栏的同时，切页签也不会丢入口 ——
   * 历史缺陷正是「工具栏只挂在货物页签、切到费用页签就整条消失」。</p>
   *
   * <p>财务单据仍由 `WorkspaceOverlay` 的 footer 槽渲染，这里传 false。</p>
   */
  showFooterActions?: boolean
  onAddItem: () => void
  onAutoSortItems: (mode?: FreightStatementSortMode) => void
  freightStatementSortDirection?: FreightStatementSortDirection
  onExpenseSelectedChange: (itemId: string, selected: boolean) => void
  onExpenseSelectAll: (selected: boolean) => void
  onExpenseChange: (
    index: number,
    patch: Partial<DocumentChargeItemDraft>,
  ) => void
  onCreateExpense: (name: string) => Promise<CreatedExpenseMaterial | undefined>
  onExpenseAddItem: () => void
  onExpenseDelete: (index: number) => void
  /** 附加费用行序变化(整行长按拖动 / 键盘 Alt+↑↓)。 */
  onExpenseReorder: (nextRowKeys: string[]) => void
  /** 附加费用行 key(顺序与 expenseItems 一致)。 */
  expenseRowKeys: string[]
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void
  onItemColumnOrderChange: (order: string[]) => void
  onToggleItemColumn: (key: string) => void
  /** 明细行序变化(整行长按拖动/键盘 Alt+↑↓ 落位): 新的 id 顺序即最终顺序; 不传=不可排序。 */
  onItemsReorder?: (nextIds: string[]) => void
  /** 明细工具栏附加操作（如销售订单交付核定的「整单取网价」）。 */
  extraActions?: React.ReactNode
}

/**
 * 编辑器明细区：货物/费用页签 + 明细工具栏 + 明细分组表 + 父单选择弹层。
 *
 * <p>本轮重构把两块分支密集的区块移出本组件：明细工具栏操作区拆到
 * ModuleItemsToolbarActions（按钮守卫 + 列设置临时状态），父单选择弹层拆到
 * ModuleParentSelectorHost（配置回退链）。原因是这些守卫内联后本函数控制流
 * 复杂度超出 react-doctor 阈值 (no-high-complexity-react-function)。
 * 页签结构、空态文案、分组表的 props 与父单弹层的挂载位置保持逐字不变。</p>
 */
export function ModuleEditorItemsSection({
  config,
  items,
  expenseItems,
  expenseSelectedItemIds,
  expenseMaterialOptions,
  expenseMaterialSearch,
  supportsExpenseTab,
  selectedItemIds,
  parentImportVisible,
  parentImporting,
  parentSelectorDisplayFieldKey,
  parentSelectorFilters,
  parentSelectorModuleKey,
  parentSelectorOpen,
  itemColumns,
  itemTableComponents,
  itemColumnOrder,
  itemRowMenus,
  visibleItemColumnKeys,
  capabilities,
  auditLabel,
  saving,
  showFooterActions = false,
  onAddItem,
  onAutoSortItems,
  freightStatementSortDirection = 'asc',
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
  onExpenseReorder,
  expenseRowKeys,
  onCancel,
  onSave,
  onOpenParentSelector,
  onCloseParentSelector,
  onRemoveSelectedItems,
  onImportParentRecord,
  onItemColumnOrderChange,
  onToggleItemColumn,
  onItemsReorder,
  extraActions,
}: Props) {
  const { t } = useTranslation()
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [activeItemTab, setActiveItemTab] = useState<'goods' | 'expenses'>(
    'goods',
  )
  const expenseTotalAmount = expenseItems.reduce(
    (sum, item) =>
      sum + (Number.isFinite(Number(item.amount)) ? Number(item.amount) : 0),
    0,
  )
  const itemGroups = useMemo(
    () => buildModuleItemGroups(config.key, items),
    [config.key, items],
  )
  const selectedItemIdSet = useMemo(
    () => new Set(selectedItemIds),
    [selectedItemIds],
  )
  const rowClassName = (record: ModuleLineItem) =>
    selectedItemIdSet.has(record.id) ? 'ant-table-row-selected' : ''
  const emptyText = config.parentImport
    ? t('modules.itemsSection.emptyTextWithImport')
    : t('modules.itemsSection.emptyText')

  const parentSelector = (
    <ModuleParentSelectorHost
      config={config}
      open={parentSelectorOpen}
      parentSelectorDisplayFieldKey={parentSelectorDisplayFieldKey}
      parentSelectorFilters={parentSelectorFilters}
      parentSelectorModuleKey={parentSelectorModuleKey}
      onImportParentRecord={onImportParentRecord}
      onCloseParentSelector={onCloseParentSelector}
    />
  )

  if (!config.itemColumns?.length) {
    return parentSelector
  }

  /*
   * 「取消 / 保存 / 保存并审核」在明细工具栏里的**唯一构建处**：两个页签共用同一份节点，
   * 所以切「货物明细 / 附加费用」都不会丢保存入口。
   * 货物页签由 ModuleItemsToolbarActions 接收它排在行末；费用页签由本组件单独挂到工具栏槽。
   */
  const footerActions = showFooterActions ? (
    <EditorFooterActions
      canSave={capabilities.save}
      canAudit={capabilities.audit}
      auditLabel={auditLabel}
      saving={saving}
      onCancel={onCancel}
      onSave={onSave}
    />
  ) : null

  return (
    <>
      <div className="mt-3">
        {supportsExpenseTab ? (
          <Tabs
            className="editor-items-tabs"
            activeKey={activeItemTab}
            onChange={(key) => setActiveItemTab(key as 'goods' | 'expenses')}
            items={[
              {
                key: 'goods',
                label: `${t('modules.itemsSection.goodsTab')} (${items.length})`,
              },
              {
                key: 'expenses',
                label: `${t('modules.itemsSection.expenseTab')} (${expenseItems.length})`,
              },
            ]}
          />
        ) : null}
        {supportsExpenseTab && activeItemTab === 'expenses' ? (
          <ModuleEditorExpensePanel
            expenseItems={expenseItems}
            expenseSelectedItemIds={expenseSelectedItemIds}
            expenseMaterialOptions={expenseMaterialOptions}
            expenseMaterialSearch={expenseMaterialSearch}
            expenseTotalAmount={expenseTotalAmount}
            saving={saving}
            /* 费用页签也渲染同一条工具栏的保存组：切页签不丢保存入口。 */
            footerActions={footerActions}
            onExpenseSelectedChange={onExpenseSelectedChange}
            onExpenseSelectAll={onExpenseSelectAll}
            onExpenseChange={onExpenseChange}
            onCreateExpense={onCreateExpense}
            onExpenseAddItem={onExpenseAddItem}
            onExpenseDelete={onExpenseDelete}
            onExpenseReorder={onExpenseReorder}
            expenseRowKeys={expenseRowKeys}
          />
        ) : null}
        {!supportsExpenseTab || activeItemTab === 'goods' ? (
          <ModuleItemsPanel
            items={items}
            itemColumns={config.itemColumns}
            expenseTotalAmount={
              supportsExpenseTab ? expenseTotalAmount : undefined
            }
            actions={
              <ModuleItemsToolbarActions
                capabilities={capabilities}
                columnSettingsOpen={columnSettingsOpen}
                config={config}
                extraActions={extraActions}
                footerActions={footerActions}
                freightStatementSortDirection={freightStatementSortDirection}
                itemColumnOrder={itemColumnOrder}
                onAddItem={onAddItem}
                onAutoSortItems={onAutoSortItems}
                onColumnSettingsOpenChange={setColumnSettingsOpen}
                onItemColumnOrderChange={onItemColumnOrderChange}
                onOpenParentSelector={onOpenParentSelector}
                onRemoveSelectedItems={onRemoveSelectedItems}
                onToggleItemColumn={onToggleItemColumn}
                parentImportVisible={parentImportVisible}
                parentImporting={parentImporting}
                saving={saving}
                selectedItemCount={selectedItemIds.length}
                visibleItemColumnKeys={visibleItemColumnKeys}
              />
            }
          >
            <ModuleItemGroupsView
              groups={itemGroups}
              moduleKey={config.key}
              columns={itemColumns}
              components={itemTableComponents}
              emptyText={emptyText}
              rowClassName={rowClassName}
              itemRowMenus={itemRowMenus}
              onItemsReorder={onItemsReorder}
            />
          </ModuleItemsPanel>
        ) : null}
      </div>

      {parentSelector}
    </>
  )
}
