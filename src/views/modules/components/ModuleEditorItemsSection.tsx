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
  onCancel: () => void
  onSave: (audit: boolean) => void
  onOpenParentSelector: () => void
  onCloseParentSelector: () => void
  onRemoveSelectedItems: () => void
  onImportParentRecord: (records: ModuleRecord[]) => void
  onItemColumnOrderChange: (order: string[]) => void
  onToggleItemColumn: (key: string) => void
  /** 明细行序变化(整行长按拖动/键盘 Alt+↑↓ 落位): 新的 id 顺序即最终顺序。 */
  onItemsReorder: (nextIds: string[]) => void
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
  showFooterActions = true,
  onAddItem,
  onAutoSortItems,
  freightStatementSortDirection = 'asc',
  onExpenseSelectedChange,
  onExpenseSelectAll,
  onExpenseChange,
  onCreateExpense,
  onExpenseAddItem,
  onExpenseDelete,
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
            onExpenseSelectedChange={onExpenseSelectedChange}
            onExpenseSelectAll={onExpenseSelectAll}
            onExpenseChange={onExpenseChange}
            onCreateExpense={onCreateExpense}
            onExpenseAddItem={onExpenseAddItem}
            onExpenseDelete={onExpenseDelete}
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
                auditLabel={auditLabel}
                capabilities={capabilities}
                columnSettingsOpen={columnSettingsOpen}
                config={config}
                extraActions={extraActions}
                freightStatementSortDirection={freightStatementSortDirection}
                itemColumnOrder={itemColumnOrder}
                onAddItem={onAddItem}
                onAutoSortItems={onAutoSortItems}
                onCancel={onCancel}
                onColumnSettingsOpenChange={setColumnSettingsOpen}
                onItemColumnOrderChange={onItemColumnOrderChange}
                onOpenParentSelector={onOpenParentSelector}
                onRemoveSelectedItems={onRemoveSelectedItems}
                onSave={onSave}
                onToggleItemColumn={onToggleItemColumn}
                parentImportVisible={parentImportVisible}
                parentImporting={parentImporting}
                saving={saving}
                selectedItemCount={selectedItemIds.length}
                showFooterActions={showFooterActions}
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
